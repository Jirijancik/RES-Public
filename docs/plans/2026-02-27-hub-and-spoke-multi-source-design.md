# Hub-and-Spoke Multi-Source Data Architecture

**Date:** 2026-02-27
**Status:** Approved
**Goal:** Restructure DB entities to support multiple Czech public register data sources via a shared Company hub model, with denormalized search fields enabling cross-source multi-parameter filtering.

## Context

Currently ARES and Justice are isolated silos:
- **ARES**: Real-time API fetch, cached only in Redis (volatile — lost on TTL expiry/restart), `EconomicSubject` model exists but is never populated
- **Justice**: Bulk XML sync into PostgreSQL with 6 models (Entity, EntityFact, Person, Address, CourtRecord, DatasetSync)
- **No shared entity** links the two sources
- **No persistent storage for ARES** — every time Redis expires, the same ARES API call must be repeated (wastes rate-limited calls)

As we add more Czech public registers (Trade Register, ISIR, RES, ISVZ, etc.), each new source would create another isolated silo without a unifying structure.

## Decision: Hub-and-Spoke Architecture

A **Company** hub model acts as the single identity anchor (keyed by ICO). Each data source stores its own models as "spokes" that FK to Company. The hub also carries a small set of **denormalized search fields** (legal form, region, employee category, revenue, NACE code) sourced from the spokes, enabling fast cross-source multi-parameter filtering without complex JOINs.

**Every-touch-persists:** Every interaction with an external data source — whether ARES search, ARES detail view, or Justice bulk sync — persists records to the local DB. The DB acts as a durable L2 cache (Redis is L1, ARES API is L3). This organically grows the local database from user activity, reduces API calls over time, and ensures the sales team's local search becomes richer with every use.

```
                 ┌─────────────────────────────────────┐
                 │            Company (Hub)             │
                 │  ICO (unique), name, is_active       │
                 │  legal_form, region_code, region_name│
                 │  employee_category, latest_revenue   │
                 │  nace_primary                        │
                 └──────────────┬───────────────────────┘
        ┌───────────────────────┼───────────────────────┐───────── ...
        ▼                       ▼                       ▼
   ┌─────────┐           ┌───────────┐           ┌──────────┐
   │  ARES   │           │  Justice  │           │  Future  │
   │ Economic│           │  Entity   │           │  Source   │
   │ Subject │           │           │           │  Record  │
   └─────────┘           └───────────┘           └──────────┘
   (region, employees,   (revenue from           (new fields
    NACE, legal form)     financial data)         added here)
```

### Why not the alternatives?

- **Unified Canonical Model** (fat Company with all fields): Requires complex merge logic from day 1, every new source changes the merge rules. Over-engineered for current needs. Multi-parameter search only needs ~6 denormalized fields, not ~100+.
- **No Hub / Query-Time Join**: Gets worse with every source (N+1 queries), no way to answer "how many companies do we track?", duplicated data. Cross-source filtering (e.g. ARES region + Justice revenue) would require in-Python intersection — impossible to paginate efficiently.

## Data Model

### New: Company model (in new `company` app)

```python
class Company(models.Model):
    # --- Identity (Phase 1) ---
    ico = models.CharField(max_length=8, unique=True, db_index=True)
    name = models.CharField(max_length=500)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # --- Denormalized search fields (Phase 2) ---
    # Populated from ARES and Justice during fetch/sync.
    # Enable fast single-table multi-parameter filtering for sales search.
    legal_form = models.CharField(max_length=10, blank=True, default="", db_index=True)
    region_code = models.IntegerField(null=True, blank=True, db_index=True)
    region_name = models.CharField(max_length=100, blank=True, default="")
    employee_category = models.CharField(max_length=50, blank=True, default="", db_index=True)
    latest_revenue = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True, db_index=True
    )
    nace_primary = models.CharField(max_length=10, blank=True, default="", db_index=True)

    class Meta:
        verbose_name_plural = "companies"
        indexes = [
            # Composite index for the most common sales search pattern
            models.Index(
                fields=["legal_form", "region_code"],
                name="idx_company_form_region",
            ),
        ]
```

#### Search field data sources

| Field | Source | Populated during | Notes |
|-------|--------|-----------------|-------|
| `legal_form` | ARES `legalForm` or Justice `legal_form_code` | ARES fetch / Justice sync | ARES is fresher (real-time API) |
| `region_code` | ARES `headquarters.regionCode` | ARES fetch only | 14 Czech regions (NUTS 3) |
| `region_name` | ARES `headquarters.regionName` | ARES fetch only | Human-readable label |
| `employee_category` | ARES `statisticalData.employeeCountCategory` | ARES fetch only | CZSO category, not exact count |
| `latest_revenue` | Justice financial statements (VZZ) | Justice sync (financial XML parse) | "Výnosy celkem" from latest VZZ |
| `nace_primary` | ARES `naceActivities[0]` | ARES fetch only | Primary NACE industry code |

### Modified: Justice Entity

Add nullable FK (nullable during migration, can be made non-null later):

```python
company = models.ForeignKey(
    "company.Company",
    on_delete=models.CASCADE,
    related_name="justice_entities",
    null=True, blank=True,
)
```

Existing `unique_together = [("ico", "dataset_id")]` stays unchanged.

### Modified: ARES EconomicSubject

Add FK, timestamps for freshness tracking, and populate on every API interaction (search + detail):

```python
company = models.ForeignKey(
    "company.Company",
    on_delete=models.CASCADE,
    related_name="ares_records",
    null=True, blank=True,
)
created_at = models.DateTimeField(auto_now_add=True)
updated_at = models.DateTimeField(auto_now=True)
```

`updated_at` is critical for the freshness strategy — it records when the record was last fetched from ARES, enabling the 3-tier lookup to decide whether to serve from DB or re-fetch.

### Untouched

EntityFact, Person, Address, CourtRecord, DatasetSync remain unchanged. They still FK to Entity (which now has an FK path to Company).

## Data Persistence & Freshness Strategy

### Every-touch-persists

Every interaction with ARES (search or detail) persists records to the local DB. This serves two purposes:

1. **L2 cache** — the DB acts as a durable cache between volatile Redis (L1) and rate-limited ARES API (L3)
2. **Hub population** — every search grows the Company table, enriching the local multi-parameter search for the sales team

### 3-tier lookup for `get_by_ico()`

```
L1: Redis (hot cache, TTL-based)
  ↓ miss
L2: DB (EconomicSubject, persistent, freshness-checked)
  ↓ miss or stale
L3: ARES API (authoritative, rate-limited)
```

On **L2 hit**: serve from DB immediately. If the record is older than `ARES_DB_FRESHNESS_TTL`, trigger a **background refresh** (non-blocking — the user gets instant data, the API call happens asynchronously).

On **L2 miss**: call ARES API, persist to DB + Redis, return result.

### Freshness threshold

```python
from datetime import timedelta

ARES_DB_FRESHNESS_TTL = timedelta(hours=24)
```

Records older than 24 hours are considered stale. Stale records are still served immediately (better than blocking on an API call), but a background refresh is scheduled to update the DB record.

### Background refresh (Phase 1: simple threading)

```python
import threading

def _schedule_background_refresh(self, ico: str) -> None:
    """Non-blocking: spawn a daemon thread to refresh stale ARES data."""
    thread = threading.Thread(
        target=self._refresh_from_api,
        args=(ico,),
        daemon=True,
    )
    thread.start()
```

Phase 3 (future): replace with Celery task for robustness, retries, and monitoring.

### Search persistence

When ARES search returns N results, each entity is persisted:

```python
# In AresService.search(), after parsing results:
for subject in result.get("economicSubjects", []):
    ico = subject.get("icoId")
    if ico:
        self._persist_search_result(ico, subject)
```

Search results contain summary-level data (ICO, name, address, legal form). Detail responses contain full data (NACE, headquarters, statistics). Both are persisted, but only detail responses populate the denormalized search fields on Company.

## Service Layer

### JusticeSyncService._upsert_entity()

During bulk import, create/link Company and update search fields:

```python
company, created = Company.objects.get_or_create(
    ico=ico,
    defaults={"name": subjekt.get("name", ""), "is_active": not bool(subjekt.get("deletion_date"))}
)

# Phase 2: Update search fields from Justice data.
update_fields = {}
legal_form_code = legal_form.get("code", "") if legal_form else ""
if legal_form_code and not company.legal_form:
    update_fields["legal_form"] = legal_form_code
if update_fields:
    Company.objects.filter(pk=company.pk).update(**update_fields)

entity = Entity.objects.create(company=company, ico=ico, ...)
```

#### Revenue extraction from Justice financial data (Phase 2)

When Justice financial XML is parsed (sbírka listin), extract "Výnosy celkem" from VZZ and update Company:

```python
def _update_company_revenue(self, company: Company, financial_data: dict) -> None:
    """Update latest_revenue on Company from parsed VZZ data."""
    vzz_rows = financial_data.get("vzz", [])
    # Row 1 in VZZ is typically "Tržby z prodeje výrobků a služeb" or total revenue
    # Use the "netto" or "current" column
    for row in vzz_rows:
        if row.get("row") == 1:  # First row = total revenue
            revenue = row.get("netto") or row.get("current")
            if revenue is not None:
                Company.objects.filter(pk=company.pk).update(latest_revenue=revenue)
            break
```

### AresService.get_by_ico() — 3-tier lookup

The main change from current architecture: `get_by_ico()` now checks DB before calling the external API.

```python
def get_by_ico(self, ico: str) -> dict:
    normalized = ico.zfill(8)
    # ... validation ...

    # L1: Redis hot cache
    cached = self.cache.get("detail", normalized)
    if cached is not None:
        return cached

    # L2: DB persistent cache
    db_record = EconomicSubject.objects.filter(ico=normalized).select_related("company").first()
    if db_record and db_record.raw_data:
        result = parse_economic_subject(db_record.raw_data)
        self.cache.set(result, "detail", normalized, ttl=ARES_DETAIL_CACHE_TTL)

        # If stale, trigger background refresh (non-blocking)
        if self._is_stale(db_record):
            self._schedule_background_refresh(normalized)

        return result

    # L3: ARES API (rate-limited)
    if not self.outbound_throttle.allow():
        raise ExternalAPIError("ARES rate limit reached.", status_code=429, ...)

    raw = self.client.get_by_ico(normalized)
    result = parse_economic_subject(raw)
    self.cache.set(result, "detail", normalized, ttl=ARES_DETAIL_CACHE_TTL)
    self._persist_detail(normalized, result, raw)  # non-blocking, try/except
    return result
```

#### Freshness check

```python
from django.utils import timezone
from datetime import timedelta

ARES_DB_FRESHNESS_TTL = timedelta(hours=24)

def _is_stale(self, record: EconomicSubject) -> bool:
    if not record.updated_at:
        return True
    return timezone.now() - record.updated_at > ARES_DB_FRESHNESS_TTL
```

#### Background refresh

```python
def _schedule_background_refresh(self, ico: str) -> None:
    """Serve stale data immediately, refresh in background."""
    import threading
    thread = threading.Thread(target=self._refresh_from_api, args=(ico,), daemon=True)
    thread.start()

def _refresh_from_api(self, ico: str) -> None:
    """Called in background thread — fetches fresh data and updates DB + Redis."""
    try:
        if not self.outbound_throttle.allow():
            return  # Don't block on rate limit in background
        raw = self.client.get_by_ico(ico)
        result = parse_economic_subject(raw)
        self.cache.set(result, "detail", ico, ttl=ARES_DETAIL_CACHE_TTL)
        self._persist_detail(ico, result, raw)
    except Exception:
        logger.warning("Background refresh failed for %s", ico, exc_info=True)
```

#### Detail persistence (includes search field extraction)

```python
def _persist_detail(self, ico: str, parsed: dict, raw: dict) -> None:
    """Persist full ARES detail to DB and update Company search fields."""
    try:
        records = parsed.get("records", [])
        record = records[0] if records else {}
        headquarters = record.get("headquarters", {}) or {}
        stats = record.get("statisticalData", {}) or {}

        company_defaults = {
            "name": record.get("businessName", ""),
            "legal_form": record.get("legalForm", "") or "",
            "region_code": headquarters.get("regionCode"),
            "region_name": headquarters.get("regionName", "") or "",
            "employee_category": stats.get("employeeCountCategory", "") or "",
            "nace_primary": (record.get("naceActivities") or [""])[0],
        }

        company, _ = Company.objects.update_or_create(
            ico=ico, defaults=company_defaults,
        )
        EconomicSubject.objects.update_or_create(
            ico=ico,
            defaults={"business_name": company_defaults["name"], "raw_data": raw, "company": company},
        )
    except Exception:
        logger.warning("Failed to persist ARES detail %s", ico, exc_info=True)
```

**Note:** ARES `update_or_create` (not `get_or_create`) ensures search fields are refreshed on every detail fetch, since ARES data is authoritative for region, employees, and NACE.

### AresService.search() — persist search results

After parsing search results, each entity is persisted to grow the local DB:

```python
def search(self, params: dict) -> dict:
    # ... existing: build request, check Redis cache, throttle, call API, parse ...
    result = parse_search_result(raw)
    self.cache.set(result, "search", cache_hash, ttl=ARES_SEARCH_CACHE_TTL)

    # NEW: persist each search result to DB (non-blocking)
    self._persist_search_results(result)

    # ... existing: cache individual subjects in Redis ...
    return result

def _persist_search_results(self, result: dict) -> None:
    """Bulk-persist search results: create Company + EconomicSubject for each entity."""
    for subject in result.get("economicSubjects", []):
        ico = subject.get("icoId")
        if not ico:
            continue
        try:
            company, _ = Company.objects.get_or_create(
                ico=ico.zfill(8),
                defaults={"name": subject.get("businessName", "")},
            )
            EconomicSubject.objects.update_or_create(
                ico=ico.zfill(8),
                defaults={
                    "business_name": subject.get("businessName", ""),
                    "raw_data": subject,
                    "company": company,
                },
            )
        except Exception:
            logger.warning("Failed to persist search result %s", ico, exc_info=True)
```

**Note:** Search uses `get_or_create` for Company (doesn't overwrite search fields with summary data), while detail uses `update_or_create` (refreshes search fields with full data). This ensures summary-level search results don't degrade existing detail-level data.

### New: CompanyService

Unified lookup and multi-parameter search across all sources:

```python
class CompanyService:
    def get_by_ico(self, ico: str) -> dict:
        company = Company.objects.get(ico=ico.zfill(8))
        return {
            "company": company,
            "ares": company.ares_records.first(),
            "justice": company.justice_entities.select_related().prefetch_related("facts").first(),
        }

    def search(self, params: dict) -> dict:
        """Multi-parameter search across denormalized Company fields.

        Supports: name, legalForm, regionCode, employeeCategory,
                  revenueMin, revenueMax, nace, status, offset, limit.
        """
        qs = Company.objects.all()

        if name := params.get("name"):
            qs = qs.filter(name__icontains=name)
        if legal_form := params.get("legalForm"):
            qs = qs.filter(legal_form=legal_form)
        if region_code := params.get("regionCode"):
            qs = qs.filter(region_code=region_code)
        if employee_cat := params.get("employeeCategory"):
            qs = qs.filter(employee_category=employee_cat)
        if revenue_min := params.get("revenueMin"):
            qs = qs.filter(latest_revenue__gte=revenue_min)
        if revenue_max := params.get("revenueMax"):
            qs = qs.filter(latest_revenue__lte=revenue_max)
        if nace := params.get("nace"):
            qs = qs.filter(nace_primary=nace)
        if params.get("status") == "active":
            qs = qs.filter(is_active=True)
        elif params.get("status") == "inactive":
            qs = qs.filter(is_active=False)

        total = qs.count()
        offset = params.get("offset", 0)
        limit = params.get("limit", 25)
        companies = qs.order_by("-latest_revenue", "name")[offset:offset + limit]

        return {
            "totalCount": total,
            "offset": offset,
            "limit": limit,
            "companies": [
                {
                    "ico": c.ico,
                    "name": c.name,
                    "isActive": c.is_active,
                    "legalForm": c.legal_form,
                    "regionCode": c.region_code,
                    "regionName": c.region_name,
                    "employeeCategory": c.employee_category,
                    "latestRevenue": str(c.latest_revenue) if c.latest_revenue else None,
                    "nacePrimary": c.nace_primary,
                }
                for c in companies
            ],
        }
```

## API Layer

### New endpoints (additive, existing endpoints unchanged)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/companies/{ico}/` | Unified company detail (hub + all sources) |
| GET | `/api/v1/companies/search/` | Multi-parameter search across all sources |

#### Company detail response

```json
{
  "ico": "12345678",
  "name": "Example s.r.o.",
  "isActive": true,
  "sources": {
    "ares": { "businessName": "...", "headquarters": {...}, ... },
    "justice": { "name": "...", "facts": [...], ... }
  },
  "updatedAt": "2026-02-27T12:00:00Z"
}
```

#### Company search request (GET query params)

```
GET /api/v1/companies/search/?legalForm=112&regionCode=19&employeeCategory=10-19&revenueMin=1000000&status=active&limit=25&offset=0
```

#### Company search response

```json
{
  "totalCount": 142,
  "offset": 0,
  "limit": 25,
  "companies": [
    {
      "ico": "12345678",
      "name": "Example s.r.o.",
      "isActive": true,
      "legalForm": "112",
      "regionCode": 19,
      "regionName": "Hlavní město Praha",
      "employeeCategory": "10-19",
      "latestRevenue": "5234000.00",
      "nacePrimary": "62010"
    }
  ]
}
```

#### Sales use case example

> "Give me all s.r.o. companies in Prague region with 10-19 employees and revenue over 1M CZK"

```
GET /api/v1/companies/search/?legalForm=112&regionCode=19&employeeCategory=10-19&revenueMin=1000000&status=active
```

This is a single PostgreSQL query on the Company table with indexed columns — no cross-table JOINs needed.

Existing `/api/v1/ares/` and `/api/v1/justice/` endpoints continue unchanged.

## Frontend

### New pages

- `/companies/[ico]` — Unified company detail with source-tabbed sections (Phase 1)
- `/companies/search` — Multi-parameter search with filter sidebar (Phase 2)

### Phase 2: Search page for sales team

The search page provides a filter-driven interface:
- **Legal form** dropdown (s.r.o., a.s., etc.)
- **Region** dropdown (14 Czech regions)
- **Employee category** dropdown (CZSO categories)
- **Revenue range** min/max inputs
- **NACE code** input (industry filter)
- **Status** active/inactive/all toggle
- Results table with sortable columns, pagination

### Approach

Existing `/justice/[ico]` and home ARES search stay. New company pages are additive. Over time, search results link to `/companies/{ico}`.

## Migration Strategy

Each phase is independently deployable with no destructive changes:

### Phase 1: Hub-and-Spoke Foundation (Tasks 1–11)

1. **Create `company` app + Company model** — new app, new migration (identity fields only at first)
2. **Add nullable `company` FK** to Entity and EconomicSubject — schema migration; add `created_at`/`updated_at` timestamps to EconomicSubject for freshness tracking
3. **Data migration** — backfill Company records from existing Justice entities (one Company per unique ICO, link Entity FKs)
4. **Update services** — Justice sync creates Company during import; ARES `get_by_ico()` becomes 3-tier lookup (Redis → DB → API) with DB persistence and background refresh; ARES `search()` persists each result to DB
5. **New API endpoints** — CompanyDetailView
6. **Frontend** — new `/companies/[ico]` page
7. **Optional: make FK non-nullable** once all records are linked

### Phase 2: Search Hub Fields (Tasks 12–17)

8. **Add search columns to Company** — migration adds `legal_form`, `region_code`, `region_name`, `employee_category`, `latest_revenue`, `nace_primary` + indexes
9. **Update ARES detail persistence** — `_persist_detail()` extracts and writes search fields from ARES API response
10. **Update Justice sync** — `_upsert_entity()` writes `legal_form`; financial XML parse writes `latest_revenue`
11. **Backfill search fields** — management command re-processes existing ARES `raw_data` and Justice financial data to populate search fields on existing Company records
12. **Company search endpoint + frontend** — `CompanySearchView` with multi-parameter filtering, search page with filter sidebar

### Phase 3: Scaling (future, if needed)

13. **Replace threading with Celery** — background refresh becomes a robust task with retries, monitoring, and dead-letter queue
14. **Composite GIN index or materialized view** — if search volume exceeds what B-tree indexes can handle
15. **Elasticsearch** — only if full-text/fuzzy search is needed on 1M+ records

## Adding Future Sources

Pattern for any new Czech public register:

1. Create new Django app (e.g., `trade_register`)
2. Define source-specific model with `company = ForeignKey("company.Company")`
3. Implement fetcher (bulk sync or real-time API)
4. In fetch/sync code: `Company.objects.get_or_create(ico=...)` then link
5. If the source provides new searchable data (e.g., ISIR insolvency status), add a denormalized field to Company and populate it during fetch/sync
6. Add source data to CompanyService and CompanyDetailView

No changes to existing spokes needed. New search fields on Company are additive migrations.
