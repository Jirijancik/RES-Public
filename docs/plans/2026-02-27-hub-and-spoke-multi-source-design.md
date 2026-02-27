# Hub-and-Spoke Multi-Source Data Architecture

**Date:** 2026-02-27
**Status:** Approved
**Goal:** Restructure DB entities to support multiple Czech public register data sources via a shared Company hub model.

## Context

Currently ARES and Justice are isolated silos:
- **ARES**: Real-time API fetch, cached in Redis, `EconomicSubject` model exists but is never populated
- **Justice**: Bulk XML sync into PostgreSQL with 6 models (Entity, EntityFact, Person, Address, CourtRecord, DatasetSync)
- **No shared entity** links the two sources

As we add more Czech public registers (Trade Register, ISIR, RES, ISVZ, etc.), each new source would create another isolated silo without a unifying structure.

## Decision: Hub-and-Spoke Architecture

A lightweight **Company** hub model acts as the single identity anchor (keyed by ICO). Each data source stores its own models as "spokes" that FK to Company. No complex field-level merging upfront.

```
                 ┌──────────────┐
                 │   Company    │  ICO (unique), name, is_active
                 └──────┬───────┘
        ┌───────────────┼───────────────┐───────── ...
        ▼               ▼               ▼
   ┌─────────┐   ┌───────────┐   ┌──────────┐
   │  ARES   │   │  Justice  │   │  Future  │
   │ Economic│   │  Entity   │   │  Source   │
   │ Subject │   │           │   │  Record  │
   └─────────┘   └───────────┘   └──────────┘
```

### Why not the alternatives?

- **Unified Canonical Model** (fat Company with all fields): Requires complex merge logic from day 1, every new source changes the merge rules. Over-engineered for current needs.
- **No Hub / Query-Time Join**: Gets worse with every source (N+1 queries), no way to answer "how many companies do we track?", duplicated data.

## Data Model

### New: Company model (in new `company` app)

```python
class Company(models.Model):
    ico = models.CharField(max_length=8, unique=True, db_index=True)
    name = models.CharField(max_length=500)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "companies"
```

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

Add FK and start populating on every API fetch:

```python
company = models.ForeignKey(
    "company.Company",
    on_delete=models.CASCADE,
    related_name="ares_records",
    null=True, blank=True,
)
```

### Untouched

EntityFact, Person, Address, CourtRecord, DatasetSync remain unchanged. They still FK to Entity (which now has an FK path to Company).

## Service Layer

### JusticeSyncService._upsert_entity()

During bulk import, create/link Company:

```python
company, _ = Company.objects.get_or_create(
    ico=ico,
    defaults={"name": subjekt.get("name", ""), "is_active": not bool(subjekt.get("deletion_date"))}
)
entity = Entity.objects.create(company=company, ico=ico, ...)
```

### AresService.get_by_ico()

After parsing API response, persist to DB alongside Redis cache:

```python
# After parse
try:
    company, _ = Company.objects.get_or_create(ico=normalized, defaults={"name": business_name})
    EconomicSubject.objects.update_or_create(
        ico=normalized,
        defaults={"business_name": business_name, "raw_data": raw, "company": company}
    )
except Exception:
    logger.warning("Failed to persist ARES record", exc_info=True)

# Cache still happens (existing behavior)
self.cache.set(result, "detail", normalized, ttl=ARES_DETAIL_CACHE_TTL)
```

Redis cache stays for fast lookups. DB persistence is write-behind, non-blocking.

### New: CompanyService

Unified lookup across all sources:

```python
class CompanyService:
    def get_by_ico(self, ico: str) -> dict:
        company = Company.objects.get(ico=ico.zfill(8))
        return {
            "company": company,
            "ares": company.ares_records.first(),
            "justice": company.justice_entities.select_related().prefetch_related("facts").first(),
        }
```

## API Layer

### New endpoints (additive, existing endpoints unchanged)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/companies/{ico}/` | Unified company detail (hub + all sources) |
| GET | `/api/v1/companies/search/` | Search across all sources |

Response shape for company detail:

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

Existing `/api/v1/ares/` and `/api/v1/justice/` endpoints continue unchanged.

## Frontend

### New pages

- `/companies/[ico]` — Unified company detail with source-tabbed sections
- Unified search (can defer — existing pages link to `/companies/{ico}`)

### Approach

Existing `/justice/[ico]` and home ARES search stay. New company page is additive. Over time, search results link to `/companies/{ico}`.

## Migration Strategy

Each phase is independently deployable with no destructive changes:

1. **Create `company` app + Company model** — new app, new migration
2. **Add nullable `company` FK** to Entity and EconomicSubject — schema migration
3. **Data migration** — backfill Company records from existing Justice entities (one Company per unique ICO, link Entity FKs)
4. **Update services** — Justice sync creates Company during import, ARES persists to DB
5. **New API endpoints** — CompanyDetailView, CompanySearchView
6. **Frontend** — new `/companies/[ico]` page
7. **Optional: make FK non-nullable** once all records are linked

## Adding Future Sources

Pattern for any new Czech public register:

1. Create new Django app (e.g., `trade_register`)
2. Define source-specific model with `company = ForeignKey("company.Company")`
3. Implement fetcher (bulk sync or real-time API)
4. In fetch/sync code: `Company.objects.get_or_create(ico=...)` then link
5. Add source data to CompanyService and CompanyDetailView

No changes to existing models, services, or endpoints needed.
