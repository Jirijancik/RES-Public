"""
ARES business logic — 3-tier caching (Redis → DB → API) + every-touch-persists.
Pattern: validate -> L1 Redis -> L2 DB -> throttle -> L3 API -> persist -> cache -> return
"""
import logging
import re
import threading

from django.utils import timezone

from core.exceptions import ExternalAPIError
from core.services.cache import CacheService
from core.throttles import GlobalOutboundThrottle
from .client import AresClient, ares_client
from .constants import ARES_DETAIL_CACHE_TTL, ARES_SEARCH_CACHE_TTL, ARES_DB_FRESHNESS_TTL
from .models import EconomicSubject
from .parser import parse_economic_subject, parse_search_result, to_search_request

logger = logging.getLogger(__name__)


# Lazy import to avoid circular imports at module level.
def _get_company_model():
    from company.models import Company
    return Company


class AresService:
    def __init__(self, client: AresClient | None = None):
        self.client = client or ares_client
        self.cache = CacheService(prefix="ares", default_ttl=ARES_SEARCH_CACHE_TTL)
        self.outbound_throttle = GlobalOutboundThrottle(
            key="ares", max_requests=12, window=60
        )

    # ── search ────────────────────────────────────────────────

    def search(self, params: dict) -> dict:
        request_body = to_search_request(params)
        cache_hash = self.cache.hash_params(request_body)

        cached = self.cache.get("search", cache_hash)
        if cached is not None:
            return cached

        if not self.outbound_throttle.allow():
            raise ExternalAPIError(
                "ARES rate limit reached. Please try again in a minute.",
                status_code=429,
                service_name="ares",
            )

        raw = self.client.search(request_body)
        result = parse_search_result(raw)

        self.cache.set(result, "search", cache_hash, ttl=ARES_SEARCH_CACHE_TTL)

        for subject in result.get("economicSubjects", []):
            ico_id = subject.get("icoId")
            if ico_id:
                self.cache.set(
                    subject, "detail", ico_id, ttl=ARES_DETAIL_CACHE_TTL
                )

        # Every-touch-persists: save each search result to DB.
        # Pass the raw Czech subjects so raw_data stays in Czech format.
        raw_subjects = raw.get("ekonomickeSubjekty", [])
        self._persist_search_results(result, raw_subjects)

        return result

    # ── get_by_ico — 3-tier lookup ────────────────────────────

    def get_by_ico(self, ico: str) -> dict:
        normalized = ico.zfill(8)
        if not re.match(r"^\d{8}$", normalized):
            raise ExternalAPIError(
                "ICO must be 8 digits.", status_code=400, service_name="ares"
            )

        # L1: Redis hot cache
        cached = self.cache.get("detail", normalized)
        if cached is not None:
            return cached

        # L2: DB persistent cache
        db_record = EconomicSubject.objects.filter(
            ico=normalized,
        ).select_related("company").first()

        if db_record and db_record.raw_data:
            result = parse_economic_subject(db_record.raw_data)
            self.cache.set(result, "detail", normalized, ttl=ARES_DETAIL_CACHE_TTL)

            # If stale, trigger non-blocking background refresh
            if self._is_stale(db_record):
                self._schedule_background_refresh(normalized)

            return result

        # L3: ARES API (rate-limited, authoritative)
        if not self.outbound_throttle.allow():
            raise ExternalAPIError(
                "ARES rate limit reached. Please try again in a minute.",
                status_code=429,
                service_name="ares",
            )

        raw = self.client.get_by_ico(normalized)
        result = parse_economic_subject(raw)

        self.cache.set(result, "detail", normalized, ttl=ARES_DETAIL_CACHE_TTL)
        self._persist_detail(normalized, result, raw)

        return result

    # ── freshness ─────────────────────────────────────────────

    def _is_stale(self, record: EconomicSubject) -> bool:
        """Check if a DB record is older than the freshness threshold."""
        if not record.updated_at:
            return True
        return timezone.now() - record.updated_at > ARES_DB_FRESHNESS_TTL

    # ── background refresh ────────────────────────────────────

    def _schedule_background_refresh(self, ico: str) -> None:
        """Spawn a daemon thread to refresh stale ARES data without blocking."""
        thread = threading.Thread(
            target=self._refresh_from_api, args=(ico,), daemon=True,
        )
        thread.start()

    def _refresh_from_api(self, ico: str) -> None:
        """Background thread: fetch fresh data and update DB + Redis."""
        try:
            if not self.outbound_throttle.allow():
                return  # Don't block on rate limit in background
            raw = self.client.get_by_ico(ico)
            result = parse_economic_subject(raw)
            self.cache.set(result, "detail", ico, ttl=ARES_DETAIL_CACHE_TTL)
            self._persist_detail(ico, result, raw)
        except Exception:
            logger.warning("Background refresh failed for %s", ico, exc_info=True)

    # ── persistence ───────────────────────────────────────────

    def _persist_detail(self, ico: str, parsed: dict, raw: dict) -> None:
        """Persist full ARES detail to DB and update Company search fields."""
        try:
            Company = _get_company_model()
            business_name = ""
            records = parsed.get("records", [])
            if records:
                business_name = records[0].get("businessName", "")

            # Extract search fields from raw ARES response (Czech keys).
            sidlo = raw.get("sidlo") or {}
            stats = raw.get("statistickeUdaje") or {}
            nace_list = raw.get("czNace") or []

            company_defaults = {
                "name": business_name,
                "legal_form": raw.get("pravniForma", "") or "",
                "region_code": sidlo.get("kodKraje"),
                "region_name": sidlo.get("nazevKraje", "") or "",
                "employee_category": stats.get("kategoriePoctuPracovniku", "") or "",
                "nace_primary": nace_list[0] if nace_list else "",
            }

            company, _ = Company.objects.update_or_create(
                ico=ico,
                defaults=company_defaults,
            )
            EconomicSubject.objects.update_or_create(
                ico=ico,
                defaults={
                    "business_name": business_name,
                    "raw_data": raw,
                    "company": company,
                },
            )
        except Exception:
            logger.warning("Failed to persist ARES detail %s", ico, exc_info=True)

    def _persist_search_results(self, result: dict, raw_subjects: list) -> None:
        """Bulk-persist search results to DB (Company + EconomicSubject per entity)."""
        Company = _get_company_model()

        # Index raw Czech subjects by ICO for O(1) lookup.
        raw_by_ico = {}
        for raw_subject in raw_subjects:
            raw_ico = raw_subject.get("ico")
            if raw_ico:
                raw_by_ico[raw_ico] = raw_subject

        for subject in result.get("economicSubjects", []):
            ico = subject.get("icoId")
            if not ico:
                continue
            try:
                normalized = ico.zfill(8)
                records = subject.get("records", [])
                business_name = records[0].get("businessName", "") if records else ""

                # Use raw Czech data for raw_data, not the parsed English output.
                raw_data = raw_by_ico.get(normalized) or raw_by_ico.get(ico)

                company, _ = Company.objects.get_or_create(
                    ico=normalized,
                    defaults={"name": business_name},
                )
                update_defaults = {
                    "business_name": business_name,
                    "company": company,
                }
                # Only write raw_data if we have the Czech source.
                if raw_data:
                    update_defaults["raw_data"] = raw_data

                EconomicSubject.objects.update_or_create(
                    ico=normalized,
                    defaults=update_defaults,
                )
            except Exception:
                logger.warning("Failed to persist search result %s", ico, exc_info=True)
