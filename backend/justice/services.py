"""
Justice business logic layer.

JusticeService:     Serves the REST API — queries stored data from PostgreSQL.
JusticeSyncService: Ingestion pipeline — downloads, parses, and upserts open data.

Pattern (same as AresService): validate → cache check → query/fetch → parse → cache → return.
"""
import logging
import re
import time
from datetime import date

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from core.exceptions import ExternalAPIError
from core.services.cache import CacheService
from core.throttles import GlobalOutboundThrottle
from .client import JusticeCKANClient, justice_ckan_client, justice_sbirka_client
from .constants import (
    DATASET_LIST_CACHE_TTL,
    ENTITY_DETAIL_CACHE_TTL,
    ENTITY_SEARCH_CACHE_TTL,
    OUTBOUND_MAX_REQUESTS,
    OUTBOUND_WINDOW,
    SBIRKA_LISTIN_CACHE_TTL,
)
from .models import Address, DatasetSync, Entity, EntityFact, Person
from .parser import (
    parse_address,
    parse_dataset_info,
    parse_document_list,
    parse_entity_detail,
    parse_entity_summary,
    parse_history_entry,
    parse_person_with_fact,
    parse_sync_status,
)
from .parsers.financial_xml_parser import parse_financial_xml
from .parsers.xml_parser import parse_xml_stream

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# JusticeService — API query layer
# ---------------------------------------------------------------------------


class JusticeService:
    """Business logic for querying stored Justice registry data."""

    def __init__(self):
        self.cache = CacheService(prefix="justice", default_ttl=ENTITY_SEARCH_CACHE_TTL)

    def get_entity_by_ico(self, ico: str) -> dict:
        """Lookup entity by ICO with full detail (facts, persons, addresses)."""
        normalized = ico.zfill(8)
        if not re.match(r"^\d{1,20}$", normalized):
            raise ExternalAPIError(
                "ICO must be numeric.", status_code=400, service_name="justice"
            )

        cached = self.cache.get("entity", normalized)
        if cached is not None:
            return cached

        entity = Entity.objects.filter(ico=normalized).order_by("-updated_at").first()
        if entity is None:
            raise ExternalAPIError(
                "Entity not found.", status_code=404, service_name="justice"
            )

        facts = (
            EntityFact.objects.filter(entity=entity)
            .select_related("person")
            .prefetch_related("addresses", "sub_facts")
            .order_by("registration_date")
        )
        result = parse_entity_detail(entity, list(facts))

        self.cache.set(result, "entity", normalized, ttl=ENTITY_DETAIL_CACHE_TTL)
        return result

    def search_entities(self, params: dict) -> dict:
        """Search entities by name, legal_form, location, status with pagination."""
        cache_hash = self.cache.hash_params(params)
        cached = self.cache.get("search", cache_hash)
        if cached is not None:
            return cached

        qs = Entity.objects.all()

        name = params.get("name")
        if name:
            qs = qs.filter(name__icontains=name)

        legal_form = params.get("legalForm")
        if legal_form:
            qs = qs.filter(legal_form_code=legal_form)

        location = params.get("location")
        if location:
            qs = qs.filter(court_code=location)

        status = params.get("status", "active")
        if status == "active":
            qs = qs.filter(is_active=True)
        elif status == "deleted":
            qs = qs.filter(is_active=False)

        total_count = qs.count()
        offset = params.get("offset", 0)
        limit = params.get("limit", 20)
        entities = qs.order_by("name")[offset : offset + limit]

        result = {
            "totalCount": total_count,
            "offset": offset,
            "limit": limit,
            "entities": [parse_entity_summary(e) for e in entities],
        }

        self.cache.set(result, "search", cache_hash, ttl=ENTITY_SEARCH_CACHE_TTL)
        return result

    def get_entity_history(self, ico: str) -> list[dict]:
        """Get change timeline for an entity — all facts sorted by date."""
        normalized = ico.zfill(8)
        entity = Entity.objects.filter(ico=normalized).order_by("-updated_at").first()
        if entity is None:
            raise ExternalAPIError(
                "Entity not found.", status_code=404, service_name="justice"
            )

        facts = (
            EntityFact.objects.filter(entity=entity)
            .order_by("registration_date", "deletion_date")
        )
        return [parse_history_entry(f) for f in facts]

    def get_entity_persons(self, ico: str) -> list[dict]:
        """Get all persons associated with an entity."""
        normalized = ico.zfill(8)
        entity = Entity.objects.filter(ico=normalized).order_by("-updated_at").first()
        if entity is None:
            raise ExternalAPIError(
                "Entity not found.", status_code=404, service_name="justice"
            )

        facts_with_persons = (
            EntityFact.objects.filter(entity=entity, person__isnull=False)
            .select_related("person")
            .order_by("registration_date")
        )
        return [parse_person_with_fact(f) for f in facts_with_persons]

    def get_entity_addresses(self, ico: str) -> list[dict]:
        """Get all addresses associated with an entity."""
        normalized = ico.zfill(8)
        entity = Entity.objects.filter(ico=normalized).order_by("-updated_at").first()
        if entity is None:
            raise ExternalAPIError(
                "Entity not found.", status_code=404, service_name="justice"
            )

        addresses = Address.objects.filter(fact__entity=entity).select_related("fact")
        return [parse_address(a) for a in addresses]

    def get_entity_documents(self, ico: str) -> dict:
        """
        Get sbírka listin documents for an entity.

        Scrapes or.justice.cz HTML pages, parses document lists,
        and extracts financial XML data when available.
        """
        normalized = ico.zfill(8)

        cached = self.cache.get("documents", normalized)
        if cached is not None:
            return cached

        client = justice_sbirka_client

        # Step 1: ICO → subjektId
        subjekt_id = client.get_subjekt_id(normalized)
        if not subjekt_id:
            raise ExternalAPIError(
                "Entity not found on or.justice.cz",
                status_code=404,
                service_name="justice",
            )

        # Step 2: subjektId → document list
        documents = client.get_document_list(subjekt_id)

        # Step 3: For each document, get file details and parse XML if present
        for doc in documents:
            files = client.get_document_files(
                doc["documentId"], doc["subjektId"], doc["spisId"]
            )
            doc["files"] = files

            # Try to find and parse XML financial data
            xml_file = next((f for f in files if f["isXml"]), None)
            if xml_file:
                try:
                    content, content_type, filename = client.download_file(
                        xml_file["downloadId"]
                    )
                    if content and b"<UcetniZaverka" in content:
                        doc["financialData"] = parse_financial_xml(content)
                    else:
                        doc["financialData"] = None
                except Exception:
                    doc["financialData"] = None
            else:
                doc["financialData"] = None

        result = {
            "subjektId": subjekt_id,
            "documents": parse_document_list(documents),
        }

        self.cache.set(
            result, "documents", normalized,
            ttl=SBIRKA_LISTIN_CACHE_TTL,
        )
        return result

    def list_datasets(self) -> list[dict]:
        """Return dataset catalog from DatasetSync table."""
        cached = self.cache.get("datasets")
        if cached is not None:
            return cached

        datasets = DatasetSync.objects.all().order_by("dataset_id")
        result = [parse_dataset_info(ds) for ds in datasets]

        self.cache.set(result, "datasets", ttl=DATASET_LIST_CACHE_TTL)
        return result

    def get_sync_status(self) -> dict:
        """Return sync health summary."""
        qs = DatasetSync.objects.all()
        total = qs.count()
        completed = qs.filter(status="completed").count()
        failed = qs.filter(status="failed").count()
        pending = qs.filter(status="pending").count()
        last_sync = qs.filter(status="completed").order_by("-last_synced_at").first()
        total_entities = qs.aggregate(total=Sum("entity_count"))["total"] or 0

        return parse_sync_status({
            "total_datasets": total,
            "completed_datasets": completed,
            "failed_datasets": failed,
            "pending_datasets": pending,
            "last_sync_at": (
                last_sync.last_synced_at.isoformat()
                if last_sync and last_sync.last_synced_at
                else None
            ),
            "total_entities": total_entities,
        })


# ---------------------------------------------------------------------------
# JusticeSyncService — Data ingestion pipeline
# ---------------------------------------------------------------------------


class JusticeSyncService:
    """Business logic for syncing data from dataor.justice.cz into PostgreSQL."""

    def __init__(self, client: JusticeCKANClient | None = None):
        self.client = client or justice_ckan_client
        self.outbound_throttle = GlobalOutboundThrottle(
            key="justice",
            max_requests=OUTBOUND_MAX_REQUESTS,
            window=OUTBOUND_WINDOW,
        )

    def sync_dataset(self, dataset_id: str, force: bool = False) -> dict:
        """Download, parse, and upsert a single dataset into the database."""
        start = time.monotonic()

        ds, _ = DatasetSync.objects.update_or_create(
            dataset_id=dataset_id,
            defaults=self._parse_dataset_id(dataset_id),
        )

        # Get metadata and find the .xml.gz resource.
        metadata = self.client.get_dataset(dataset_id)
        xml_gz_resource = self._find_xml_gz_resource(metadata)
        if xml_gz_resource is None:
            ds.status = "failed"
            ds.error_message = "No .xml.gz resource found in dataset"
            ds.save()
            return self._sync_result(ds, start)

        filename = xml_gz_resource["url"].rsplit("/", 1)[-1]
        remote_size = self.client.get_file_size(filename)

        # Skip unchanged datasets unless forced.
        if (
            not force
            and ds.status == "completed"
            and remote_size
            and ds.file_size == remote_size
        ):
            return {
                "datasetId": dataset_id,
                "status": "skipped",
                "entityCount": ds.entity_count,
                "durationSeconds": 0,
            }

        # Download phase.
        ds.status = "downloading"
        ds.save()

        if not self.outbound_throttle.allow():
            raise ExternalAPIError(
                "Justice rate limit reached. Please try again in a minute.",
                status_code=429,
                service_name="justice",
            )

        data_stream = self.client.download_file_stream(filename)

        # Parse and upsert phase.
        ds.status = "parsing"
        ds.save()

        entity_count = 0
        try:
            with transaction.atomic():
                # Full replace: delete existing entities for this dataset.
                Entity.objects.filter(dataset_id=dataset_id).delete()

                for subjekt in parse_xml_stream(data_stream):
                    self._upsert_entity(subjekt, dataset_id)
                    entity_count += 1

            ds.status = "completed"
            ds.entity_count = entity_count
            ds.file_size = remote_size
            ds.last_synced_at = timezone.now()
            ds.error_message = ""
        except Exception as e:
            logger.exception("Failed to sync dataset %s", dataset_id)
            ds.status = "failed"
            ds.error_message = str(e)[:2000]

        ds.duration_seconds = time.monotonic() - start
        ds.save()

        return self._sync_result(ds, start)

    def sync_all_actual(
        self,
        legal_forms: list[str] | None = None,
        locations: list[str] | None = None,
        year: int | None = None,
        force: bool = False,
    ) -> list[dict]:
        """Sync all 'actual' datasets matching the given filters."""
        all_ids = self.client.list_datasets()

        matching = []
        for ds_id in all_ids:
            parsed = self._parse_dataset_id(ds_id)
            if parsed["dataset_type"] != "actual":
                continue
            if legal_forms and parsed["legal_form"] not in legal_forms:
                continue
            if locations and parsed["location"] not in locations:
                continue
            if year and parsed["year"] != year:
                continue
            matching.append(ds_id)

        results = []
        for ds_id in matching:
            try:
                result = self.sync_dataset(ds_id, force=force)
                results.append(result)
            except Exception as e:
                logger.exception("Failed to sync %s", ds_id)
                results.append({
                    "datasetId": ds_id,
                    "status": "failed",
                    "entityCount": 0,
                    "durationSeconds": 0,
                    "error": str(e)[:500],
                })

        return results

    def _upsert_entity(self, subjekt: dict, dataset_id: str) -> Entity | None:
        """Create an Entity and all related records from a parsed Subjekt dict."""
        ico = subjekt.get("ico", "").zfill(8)
        if not ico or ico == "00000000":
            return None

        file_ref = self._extract_file_reference(subjekt.get("facts", []))
        legal_form = self._extract_legal_form(subjekt.get("facts", []))

        entity = Entity.objects.create(
            ico=ico,
            name=subjekt.get("name", ""),
            registration_date=_parse_date(subjekt.get("registration_date")),
            deletion_date=_parse_date(subjekt.get("deletion_date")),
            legal_form_code=legal_form.get("code", "") if legal_form else "",
            legal_form_name=legal_form.get("name", "") if legal_form else "",
            court_code=file_ref.get("court_code", "") if file_ref else "",
            court_name=file_ref.get("court_name", "") if file_ref else "",
            file_section=file_ref.get("section", "") if file_ref else "",
            file_number=_safe_int(file_ref.get("insert")) if file_ref else None,
            file_reference=(
                f"{file_ref['section']} {file_ref['insert']}/{file_ref['court_code']}"
                if file_ref and file_ref.get("section")
                else ""
            ),
            dataset_id=dataset_id,
            is_active=not bool(subjekt.get("deletion_date")),
        )

        # Collect all facts as a flat list (DFS order), persons, and addresses.
        # Each entry: (fact_kwargs, depth, parent_collect_index)
        fact_entries = []
        persons_to_create = []
        addresses_to_create = []

        _collect_facts(
            entity,
            subjekt.get("facts", []),
            fact_entries,
            persons_to_create,
            addresses_to_create,
            depth=0,
            parent_collect_index=None,
        )

        # Group by depth for level-by-level bulk_create.
        max_depth = max((e[1] for e in fact_entries), default=-1)
        # Map from collect_index → created EntityFact pk
        pk_by_collect_index = {}

        for depth in range(max_depth + 1):
            objs = []
            collect_indices = []
            for ci, (fact_kwargs, d, parent_ci) in enumerate(fact_entries):
                if d != depth:
                    continue
                parent_pk = (
                    pk_by_collect_index[parent_ci]
                    if parent_ci is not None
                    else None
                )
                objs.append(EntityFact(**fact_kwargs, parent_fact_id=parent_pk))
                collect_indices.append(ci)
            created = EntityFact.objects.bulk_create(objs)
            for ci, fact_obj in zip(collect_indices, created):
                pk_by_collect_index[ci] = fact_obj.pk

        # Resolve fact PKs for persons and addresses.
        for person_data in persons_to_create:
            ci = person_data.pop("_fact_idx")
            person_data["fact_id"] = pk_by_collect_index[ci]
        for address_data in addresses_to_create:
            ci = address_data.pop("_fact_idx")
            address_data["fact_id"] = pk_by_collect_index[ci]

        if persons_to_create:
            Person.objects.bulk_create([Person(**p) for p in persons_to_create])
        if addresses_to_create:
            Address.objects.bulk_create([Address(**a) for a in addresses_to_create])

        return entity

    def _extract_file_reference(self, facts: list[dict]) -> dict | None:
        """Find the spisZn (file reference) from the fact tree."""
        for fact in facts:
            ref = fact.get("file_reference")
            if ref and ref.get("section"):
                return ref
            sub_ref = self._extract_file_reference(fact.get("sub_facts", []))
            if sub_ref:
                return sub_ref
        return None

    def _extract_legal_form(self, facts: list[dict]) -> dict | None:
        """Find the pravniForma (legal form) from the fact tree."""
        for fact in facts:
            lf = fact.get("legal_form")
            if lf and lf.get("code"):
                return lf
            sub_lf = self._extract_legal_form(fact.get("sub_facts", []))
            if sub_lf:
                return sub_lf
        return None

    def _find_xml_gz_resource(self, metadata: dict) -> dict | None:
        """Find the .xml.gz resource from dataset metadata."""
        for resource in metadata.get("resources", []):
            url = resource.get("url", "")
            fmt = resource.get("format", "")
            if fmt == "XML_GZ" or url.endswith(".xml.gz"):
                return resource
        return None

    @staticmethod
    def _parse_dataset_id(dataset_id: str) -> dict:
        """Parse 'sro-actual-praha-2024' into components."""
        parts = dataset_id.rsplit("-", 3)
        if len(parts) >= 4:
            year_str = parts[-1]
            location = parts[-2]
            ds_type = parts[-3]
            legal_form = "-".join(parts[:-3])
        elif len(parts) == 3:
            year_str = parts[-1]
            location = parts[-2]
            ds_type = "actual"
            legal_form = parts[0]
        else:
            year_str = ""
            location = ""
            ds_type = ""
            legal_form = dataset_id

        try:
            year = int(year_str)
        except (ValueError, TypeError):
            year = 0

        return {
            "legal_form": legal_form,
            "dataset_type": ds_type,
            "location": location,
            "year": year,
        }

    @staticmethod
    def _sync_result(ds: DatasetSync, start: float) -> dict:
        return {
            "datasetId": ds.dataset_id,
            "status": ds.status,
            "entityCount": ds.entity_count,
            "durationSeconds": round(time.monotonic() - start, 2),
        }


# ---------------------------------------------------------------------------
# Utility functions (module-level, stateless)
# ---------------------------------------------------------------------------


def _collect_facts(
    entity: Entity,
    facts: list[dict],
    fact_entries: list,
    persons_list: list,
    addresses_list: list,
    depth: int,
    parent_collect_index: int | None,
):
    """
    Collect all facts into a flat list in DFS order.

    Each entry is (fact_kwargs_dict, depth, parent_collect_index).
    The collect_index is the position in fact_entries, used later to
    resolve parent PKs after level-by-level creation.
    """
    for fact_dict in facts:
        fact_type = fact_dict.get("fact_type") or {}
        collect_index = len(fact_entries)

        fact_kwargs = {
            "entity": entity,
            "header": fact_dict.get("header", ""),
            "fact_type_code": fact_type.get("code", ""),
            "fact_type_name": fact_type.get("name", ""),
            "value_text": fact_dict.get("value_text", ""),
            "value_data": fact_dict.get("value_data"),
            "registration_date": _parse_date(fact_dict.get("registration_date")),
            "deletion_date": _parse_date(fact_dict.get("deletion_date")),
            "function_name": fact_dict.get("function_name", ""),
            "function_from": _parse_date(fact_dict.get("function_from")),
            "function_to": _parse_date(fact_dict.get("function_to")),
            "membership_from": _parse_date(fact_dict.get("membership_from")),
            "membership_to": _parse_date(fact_dict.get("membership_to")),
        }
        fact_entries.append((fact_kwargs, depth, parent_collect_index))

        # Person
        person_dict = fact_dict.get("person")
        if person_dict:
            is_natural = person_dict.get("type") == "natural"
            persons_list.append({
                "_fact_idx": collect_index,
                "first_name": person_dict.get("first_name", ""),
                "last_name": person_dict.get("last_name", ""),
                "birth_date": _parse_date(person_dict.get("birth_date")),
                "title_before": person_dict.get("title_before", ""),
                "title_after": person_dict.get("title_after", ""),
                "entity_name": person_dict.get("entity_name", ""),
                "entity_ico": person_dict.get("ico", ""),
                "reg_number": person_dict.get("reg_number", ""),
                "euid": person_dict.get("euid", ""),
                "person_text": person_dict.get("person_text", ""),
                "is_natural_person": is_natural,
            })

        # Addresses
        for addr_key, addr_type in [("address", "address"), ("residence", "residence")]:
            addr_dict = fact_dict.get(addr_key)
            if addr_dict:
                addresses_list.append({
                    "_fact_idx": collect_index,
                    "address_type": addr_type,
                    "country": addr_dict.get("country", ""),
                    "municipality": addr_dict.get("municipality", ""),
                    "city_part": addr_dict.get("city_part", ""),
                    "street": addr_dict.get("street", ""),
                    "house_number": addr_dict.get("house_number", ""),
                    "orientation_number": addr_dict.get("orientation_number", ""),
                    "evidence_number": addr_dict.get("evidence_number", ""),
                    "number_text": addr_dict.get("number_text", ""),
                    "postal_code": addr_dict.get("postal_code", ""),
                    "district": addr_dict.get("district", ""),
                    "full_address": addr_dict.get("full_address", ""),
                    "supplementary_text": addr_dict.get("supplementary_text", ""),
                })

        # Recurse into sub-facts.
        sub_facts = fact_dict.get("sub_facts", [])
        if sub_facts:
            _collect_facts(
                entity, sub_facts, fact_entries,
                persons_list, addresses_list,
                depth=depth + 1,
                parent_collect_index=collect_index,
            )


def _parse_date(value: str | None):
    """Parse a date string (YYYY-MM-DD) or return None."""
    if not value:
        return None
    try:
        parts = value.split("-")
        if len(parts) == 3:
            return date(int(parts[0]), int(parts[1]), int(parts[2]))
    except (ValueError, IndexError):
        pass
    return None


def _safe_int(value) -> int | None:
    """Convert to int or return None."""
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None
