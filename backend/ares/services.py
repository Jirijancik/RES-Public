"""
ARES business logic + caching layer.
Pattern: validate -> check cache -> throttle -> client -> parse -> cache -> return
"""
import re

from core.exceptions import ExternalAPIError
from core.services.cache import CacheService
from core.throttles import GlobalOutboundThrottle
from .client import AresClient, ares_client
from .constants import ARES_DETAIL_CACHE_TTL, ARES_SEARCH_CACHE_TTL
from .parser import parse_economic_subject, parse_search_result, to_search_request


class AresService:
    def __init__(self, client: AresClient | None = None):
        self.client = client or ares_client
        self.cache = CacheService(prefix="ares", default_ttl=ARES_SEARCH_CACHE_TTL)
        self.outbound_throttle = GlobalOutboundThrottle(
            key="ares", max_requests=12, window=60
        )

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

        return result

    def get_by_ico(self, ico: str) -> dict:
        normalized = ico.zfill(8)
        if not re.match(r"^\d{8}$", normalized):
            raise ExternalAPIError(
                "ICO must be 8 digits.", status_code=400, service_name="ares"
            )

        cached = self.cache.get("detail", normalized)
        if cached is not None:
            return cached

        if not self.outbound_throttle.allow():
            raise ExternalAPIError(
                "ARES rate limit reached. Please try again in a minute.",
                status_code=429,
                service_name="ares",
            )

        raw = self.client.get_by_ico(normalized)
        result = parse_economic_subject(raw)

        self.cache.set(result, "detail", normalized, ttl=ARES_DETAIL_CACHE_TTL)
        return result
