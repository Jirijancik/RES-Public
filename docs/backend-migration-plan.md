# GTDN Backend Migration Plan — Chunked for Claude Opus 4.6

## Context

The GTDN project (`/Users/jancik/Programming/GTDN/res/`) is a Next.js 16.1.1 application that currently calls the Czech ARES government API directly from the browser, parses Czech fields to English client-side, and handles contact/newsletter forms via Next.js API routes.

The comprehensive architecture document at `docs/backend-architecture.md` (2400 lines) describes the target state: a Django REST API backend with Docker, PostgreSQL, Redis, and Nginx. **No backend infrastructure exists yet** — no `backend/` directory, no `docker-compose.yml`, no Dockerfile.

This plan breaks the migration into 7 self-contained chunks. Each chunk is designed to be pasted into a fresh Claude Opus 4.6 context window with all necessary instructions.

---

## Chunk 1: Docker Infrastructure & Django Project Scaffolding

### Context for Opus
You are working on an existing Next.js 16.1.1 project at `/Users/jancik/Programming/GTDN/res/`. There is no backend yet. You will create the complete Docker infrastructure and Django project scaffolding from scratch.

### Reference
Read `docs/backend-architecture.md` — Section 2 (Docker) and Section 3 (Backend Structure, config/ files only).

### Files to Create
```
backend/
├── Dockerfile                    (multi-stage: builder + production, 5 sync workers)
├── .dockerignore
├── manage.py
├── requirements/
│   ├── base.txt                  (Django>=5.1, DRF, django-redis, redis, requests, psycopg, pdfplumber, bs4)
│   ├── dev.txt                   (pytest, responses, factory-boy, ruff, debug-toolbar)
│   └── prod.txt                  (gunicorn>=22.0)
├── .env                          (dev defaults for all Django + email + turnstile vars)
└── config/
    ├── __init__.py
    ├── settings/
    │   ├── __init__.py
    │   ├── base.py               (full settings: DB, cache, email, DRF, CORS, etc.)
    │   ├── development.py        (DEBUG=True, CORS_ALLOW_ALL_ORIGINS=True)
    │   └── production.py         (strict security headers)
    ├── urls.py                   (admin + health only; ares/justice/contacts COMMENTED OUT)
    └── wsgi.py

docker-compose.yml                (django, db postgres:16-alpine, redis 7-alpine, nginx alpine)
docker-compose.dev.yml            (bind mount, runserver, exposed ports 8000/5432/6379)
nginx/
└── nginx.conf                    (/api/ → django, /admin/ → django, /static/ → shared volume)
```

### Files to Modify
- `.gitignore` — add Python/Django patterns: `backend/.env`, `**/__pycache__/`, `*.pyc`, `backend/staticfiles/`

### Critical Details
- In `config/settings/base.py`: include `"core"` in INSTALLED_APPS (active), but **COMMENT OUT** `"ares"`, `"justice"`, `"contacts"` with a note `# Uncommented by Chunk N`
- In `config/urls.py`: include only `admin/` and a temporary inline health check returning `{"status":"ok"}`. **Comment out** ares, justice, contacts URL includes
- The `backend/.env` must include: `DJANGO_SECRET_KEY`, `DB_NAME=gtdn`, `DB_USER=gtdn_user`, `DB_PASSWORD=changeme`, `DB_HOST=db`, `DB_PORT=5432`, `REDIS_URL=redis://redis:6379/0`, plus all `MAIL_*` and `TURNSTILE_SECRET_KEY` vars from the existing `.env.example`

### Verification
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml build
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
sleep 10
docker compose ps                                      # all services running
curl -s http://localhost:8000/api/health/               # {"status":"ok"}
docker compose exec django python manage.py showmigrations | head -5  # DB reachable
docker compose exec redis redis-cli ping                # PONG
docker compose down
```

---

## Chunk 2: Core App (Shared Infrastructure)

### Context for Opus
Chunk 1 has created `backend/` with Docker, Django config, and requirements. The project boots and responds at `/api/health/`. You now create the `core` shared infrastructure app that all domain apps depend on.

### Reference
Read `docs/backend-architecture.md` — search for `core/services/cache.py`, `core/exceptions.py`, `core/mixins.py`, `core/throttles.py`. Also read the existing TypeScript file `src/lib/turnstile.ts` (155 lines) to port the Turnstile verification logic.

### Files to Create
```
backend/core/
├── __init__.py
├── apps.py
├── urls.py                       (single health-check URL)
├── views.py                      (health check: ping Redis, return status)
├── exceptions.py                 (ExternalAPIError + custom_exception_handler for DRF)
├── mixins.py                     (TurnstileVerificationMixin)
├── throttles.py                  (AresSearchThrottle 30/min, AresDetailThrottle 60/min,
│                                  ContactFormThrottle 5/hour, GlobalOutboundThrottle)
└── services/
    ├── __init__.py
    ├── cache.py                  (CacheService: _make_key, hash_params, get, set)
    └── turnstile.py              (port from src/lib/turnstile.ts — same error codes,
                                   10s timeout, form-urlencoded POST to Cloudflare)
```

### Files to Modify
- `backend/config/urls.py` — replace the inline health check with `path("api/health/", include("core.urls"))`

### Critical Details for turnstile.py
Port the EXACT logic from `src/lib/turnstile.ts`:
- POST to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `application/x-www-form-urlencoded`
- Use `requests` library with 10-second timeout
- Map all 7 error codes: `timeout-or-duplicate`, `invalid-input-response`, `invalid-input-secret`, `missing-input-response`, `missing-input-secret`, `bad-request`, `internal-error`
- Read secret from `django.conf.settings.TURNSTILE_SECRET_KEY`
- Return `{"success": bool, "error": str | None}`

### Verification
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
sleep 10
curl -s http://localhost:8000/api/health/ | python3 -m json.tool   # {"status":"ok","cache":"ok"}
docker compose exec django python -c "from core.services.cache import CacheService; print('OK')"
docker compose exec django python -c "from core.services.turnstile import verify_turnstile_token; print('OK')"
docker compose exec django python -c "from core.exceptions import ExternalAPIError; print('OK')"
docker compose exec django python -c "from core.throttles import GlobalOutboundThrottle; print('OK')"
docker compose down
```

---

## Chunk 3: ARES Django App

### Context for Opus
Chunks 1-2 created Docker infrastructure and the `core/` app with CacheService, ExternalAPIError, GlobalOutboundThrottle, etc. You now create the `ares` Django app that proxies the Czech ARES government API, caches results in Redis, and returns pre-parsed English JSON.

### Reference
Read `docs/backend-architecture.md` — search for all `ares/` code examples. **Critically**, also read these existing TypeScript files for the complete field mappings:
- `src/lib/ares/ares.parser.ts` (181 lines) — ALL Czech→English field mappings to port
- `src/lib/ares/ares.types.ts` (310 lines) — English entity types define the JSON contract
- `src/lib/ares/ares.constants.ts` (137 lines) — 14 regions, 76 districts, base URL, timeouts

### Files to Create
```
backend/ares/
├── __init__.py
├── apps.py
├── constants.py       (ARES_BASE_URL, timeouts, TTLs, REGION_CODES, DISTRICT_CODES)
├── client.py          (AresClient with requests.Session, search + get_by_ico, error mapping)
├── parser.py          (Port ALL fields from ares.parser.ts — see critical details below)
├── services.py        (AresService: cache check → throttle → client → parse → cache, with DI)
├── serializers.py     (DRF serializers matching TypeScript entity types exactly)
├── views.py           (AresSearchView POST, AresSubjectDetailView GET — thin, max 15 lines)
├── urls.py            (search/, subjects/<str:ico>/)
├── models.py          (EconomicSubject placeholder: ico, business_name, raw_data JSONField)
└── tests/
    ├── __init__.py
    ├── test_parser.py
    ├── test_services.py
    └── test_views.py
```

### Files to Modify
- `backend/config/settings/base.py` — uncomment `"ares"` in INSTALLED_APPS
- `backend/config/urls.py` — uncomment `path("api/v1/ares/", include("ares.urls"))`

### Critical Details — parser.py MUST map ALL fields
The architecture doc shows abbreviated parser code. The actual parser MUST include every field from `ares.parser.ts`:

**`parse_headquarters()`** — 30 fields:
`countryCode`, `countryName`, `regionCode`, `regionName`, `districtCode`, `districtName`, `municipalityCode`, `municipalityName`, `administrativeDistrictCode`, `administrativeDistrictName`, `cityDistrictCode`, `cityDistrictName`, `cityPartCode`, `cityPartName`, `streetCode`, `streetName`, `buildingNumber`, `addressSupplement`, `municipalityPartCode`, `orientationNumber`, `orientationNumberLetter`, `municipalityPartName`, `addressPointCode`, `postalCode`, `textAddress`, `addressNumberTo`, `addressStandardized`, `postalCodeText`, `buildingNumberType`

**`parse_registration_statuses()`** — 16 fields:
`rosStatus`, `businessRegisterStatus`, `resStatus`, `tradeRegisterStatus`, `nrpzsStatus`, `rpshStatus`, `rcnsStatus`, `szrStatus`, `vatStatus`, `slovakVatStatus`, `sdStatus`, `irStatus`, `ceuStatus`, `rsStatus`, `redStatus`, `monitorStatus`

**`parse_economic_subject()`** — ALL business record fields including:
`legalFormRos`, `taxOffice` (from `financniUrad`), `slovakVatId` (from `dicSkDph`), `naceActivities2008` (from `czNace2008`), `deliveryAddress`, `primarySource` (from `primarniZdroj`), `subRegisterSzr`

**`to_search_request()`** — include `sorting` (from `razeni`) and `municipalityCode` in location

### Verification
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
sleep 15
docker compose exec django python manage.py migrate
# Search for companies
curl -s -X POST http://localhost:8000/api/v1/ares/search/ \
  -H "Content-Type: application/json" \
  -d '{"businessName": "Alza", "count": 2}' | python3 -m json.tool
# Detail by ICO (Alza.cz)
curl -s http://localhost:8000/api/v1/ares/subjects/27082440/ | python3 -m json.tool
# Verify Redis caching
docker compose exec redis redis-cli KEYS "gtdn:*"
# Run tests
docker compose exec django pytest ares/tests/ -v
docker compose down
```

---

## Chunk 4: Contacts Django App

### Context for Opus
Chunks 1-2 created Docker + core app. You now create the `contacts` app that replaces two Next.js API routes: contact form and newsletter. Read the existing routes to understand the exact behavior:
- `src/app/api/contact-form/route.ts` (93 lines)
- `src/app/api/newsletter/route.ts` (79 lines)

### Reference
Read `docs/backend-architecture.md` — search for `contacts/` code and the Django Admin section.

### Files to Create
```
backend/contacts/
├── __init__.py
├── apps.py
├── models.py          (ContactSubmission + NewsletterSubscriber)
├── serializers.py     (ContactFormSerializer + NewsletterSerializer with validation)
├── services.py        (ContactService.submit + NewsletterService.subscribe — Django email)
├── views.py           (ContactFormView + NewsletterView with TurnstileVerificationMixin)
├── urls.py            (contact-form/, newsletter/)
├── admin.py           (register both models for Django Admin)
└── tests/
    ├── __init__.py
    └── test_views.py
```

### Files to Modify
- `backend/config/settings/base.py` — uncomment `"contacts"` in INSTALLED_APPS
- `backend/config/urls.py` — uncomment `path("api/v1/contacts/", include("contacts.urls"))`

### Critical Details
- **Validation** must match frontend Zod schema: name 2-50 chars, surname 2-50 chars, email valid, phone 9+ chars with regex `^[+]?[0-9\s\-()]+$`, message 10-1000 chars, gdprConsent must be True
- **Email templates** must match the current Next.js route outputs (HTML + plain text)
- **Newsletter** uses `update_or_create` on email (upsert behavior)
- Both views use `TurnstileVerificationMixin` and `ContactFormThrottle`
- **Success messages** must match exactly: `"Message sent successfully!"` and `"Successfully subscribed to newsletter!"`

### Verification
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
sleep 15
docker compose exec django python manage.py makemigrations contacts
docker compose exec django python manage.py migrate
# Test validation (should return 400)
curl -s -X POST http://localhost:8000/api/v1/contacts/contact-form/ \
  -H "Content-Type: application/json" -d '{}' | python3 -m json.tool
# Verify Django Admin accessible
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/admin/login/  # 200
# Run tests
docker compose exec django pytest contacts/tests/ -v
docker compose down
```

---

## Chunk 5: Justice Django App

### Context for Opus
Chunks 1-2 created Docker + core app. You now create the `justice` app — a NEW feature (not in the current frontend) for downloading and parsing PDF/CSV files from the Czech Justice Registry.

### Reference
Read `docs/backend-architecture.md` — search for all `justice/` code examples.

### Files to Create
```
backend/justice/
├── __init__.py
├── apps.py
├── constants.py       (JUSTICE_BASE_URL, JUSTICE_OPENDATA_URL, timeouts, TTLs)
├── client.py          (JusticeClient: download_csv, download_document)
├── parsers/
│   ├── __init__.py
│   ├── pdf_parser.py  (PDFParser: extract_text, extract_tables, detect_document_type)
│   └── csv_parser.py  (JusticeCSVParser: parse_stream, parse_all, _decode UTF-8/cp1250)
├── services.py        (JusticeService: get_document, import_companies_csv)
├── serializers.py     (input/output serializers)
├── views.py           (JusticeDocumentView, JusticeSearchView)
├── urls.py            (documents/, search/)
├── models.py          (CourtRecord placeholder)
└── tests/
    ├── __init__.py
    ├── test_parsers.py
    └── fixtures/       (sample test files)
```

### Files to Modify
- `backend/config/settings/base.py` — uncomment `"justice"` in INSTALLED_APPS
- `backend/config/urls.py` — uncomment `path("api/v1/justice/", include("justice.urls"))`

### Critical Details
- PDF metadata cached in Redis (24h TTL), full text NOT cached (too large for 256MB Redis)
- CSV results cached for 12 hours
- PDF size limit: 50MB
- CSV decoder: try UTF-8 first, fallback to cp1250 (Czech Windows encoding)

### Verification
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
sleep 15
docker compose exec django python manage.py makemigrations justice
docker compose exec django python manage.py migrate
docker compose exec django python -c "
from justice.parsers.csv_parser import JusticeCSVParser
parser = JusticeCSVParser()
result = parser.parse_all(b'ico,nazev,pravni_forma\n12345678,Test Company,s.r.o.')
assert result[0]['ico'] == '12345678'
print('CSV parser OK:', result)
"
docker compose exec django pytest justice/tests/ -v
docker compose down
```

---

## Chunk 6: Frontend Migration

### Context for Opus
The Django backend is fully operational (Chunks 1-5). You now update the Next.js frontend to call Django instead of ARES directly, and remove server-side code that moved to Django.

### Reference
Read `docs/backend-architecture.md` — Section 7 (Next.js Integration).

### Files to Create
- `src/lib/api/client.ts` — axios instance with `baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"`
- `src/lib/api/server.ts` — server-only fetch wrapper for Server Components using `process.env.API_BASE_URL`

### Files to Modify

**`src/lib/ares/ares.endpoints.ts`** — Full rewrite:
- Remove `createAresClient()`, remove `aresParser` import, remove Czech type imports
- Import `apiClient` from `@/lib/api/client`
- `search()`: POST to `/ares/search/` with params directly (Django parses). Return `response.data`
- `getByIco()`: GET `/ares/subjects/{ico}/`. Return `response.data`
- KEEP the `AresApiError` class (used by `ares-search-results.tsx`)
- Map axios errors to `AresApiError` in an interceptor

**`src/lib/ares/ares.types.ts`** — Delete lines 1-166 (all Czech `AresApi*` interfaces). Keep lines 168-310 (English entity types: `AresHeadquarters`, `AresBusinessRecord`, `AresEconomicSubject`, `AresSearchResult`, `AresSearchParams`, etc.)

**`src/lib/ares/index.ts`** — Remove: all `AresApi*` type exports (lines 3-12), `aresParser` export (line 38). Keep everything else.

**`src/components/contact/contact-form.tsx`** — Line 92: change `fetch("/api/contact-form",` to use the Django URL: `` fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/contacts/contact-form/`, ``

**`src/components/newsletter/newsletter-form.tsx`** — Line 50: change `fetch("/api/newsletter",` to use the Django URL: `` fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/contacts/newsletter/`, ``

**`.env.example`** — Add: `NEXT_PUBLIC_API_URL="http://localhost:8000/api/v1"` and `API_BASE_URL="http://localhost:8000"`

### Files to Delete
- `src/lib/ares/ares.parser.ts` (logic moved to Django `ares/parser.py`)
- `src/lib/turnstile.ts` (logic moved to Django `core/services/turnstile.py`)
- `src/app/api/contact-form/route.ts` (replaced by Django endpoint)
- `src/app/api/newsletter/route.ts` (replaced by Django endpoint)
- `src/app/api/contact-form/` directory (if empty)
- `src/app/api/newsletter/` directory (if empty)
- `src/app/api/` directory (if empty after above deletions)

### Critical Details
- `AresApiError` must stay in `ares.endpoints.ts` — it's imported by `src/components/home/ares-search-results.tsx`
- `ares.queries.ts` and `ares.mutations.ts` import from `./ares.endpoints` — they need NO changes since `aresEndpoints` still exports the same `search()` and `getByIco()` methods
- `REGION_CODES` and `DISTRICT_CODES` stay in `ares.constants.ts` — they're used by frontend select components
- The `nodemailer` npm package can optionally be uninstalled since no server-side routes use it anymore

### Verification
```bash
# Verify deleted files are gone
test ! -f src/lib/ares/ares.parser.ts && echo "parser deleted OK"
test ! -f src/lib/turnstile.ts && echo "turnstile deleted OK"
test ! -f src/app/api/contact-form/route.ts && echo "contact route deleted OK"
test ! -f src/app/api/newsletter/route.ts && echo "newsletter route deleted OK"
# TypeScript compilation
npx tsc --noEmit
# Next.js build
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 npm run build
```

---

## Chunk 7: Integration Testing & Final Cleanup

### Context for Opus
All 6 previous chunks are complete. The Django backend has core, ares, justice, contacts apps. The Next.js frontend points at Django. You now run full integration tests and fix any remaining issues.

### Reference
Read `docs/backend-architecture.md` — Implementation Phases and Verification Checklist at the end.

### Files to Verify/Fix
- `backend/config/settings/base.py` — all 4 apps uncommented in INSTALLED_APPS
- `backend/config/urls.py` — all 5 URL includes active
- `backend/config/settings/production.py` — ALLOWED_HOSTS, CORS, security headers
- `backend/config/settings/development.py` — DEBUG=True, CORS_ALLOW_ALL_ORIGINS
- `.gitignore` — complete Python/Django coverage

### Verification (full integration)
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
sleep 20
docker compose exec django python manage.py migrate

# Backend health
curl -s http://localhost:8000/api/health/ | python3 -m json.tool

# ARES search
curl -s -X POST http://localhost:8000/api/v1/ares/search/ \
  -H "Content-Type: application/json" -d '{"businessName":"Alza","count":1}' | python3 -m json.tool

# ARES detail
curl -s http://localhost:8000/api/v1/ares/subjects/27082440/ | python3 -m json.tool

# Contacts validation (expect 400)
curl -s -X POST http://localhost:8000/api/v1/contacts/contact-form/ \
  -H "Content-Type: application/json" -d '{}' -w "\nHTTP: %{http_code}\n"

# Redis cache populated
docker compose exec redis redis-cli KEYS "gtdn:*"

# All Django tests pass
docker compose exec django pytest -v

# Django deploy check
docker compose exec django python manage.py check --deploy 2>&1 | head -20

# Frontend compiles
npx tsc --noEmit
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 npm run build

docker compose down
```

---

## Execution Order

| Phase | Chunk | Title | Depends On | Notes |
|-------|-------|-------|------------|-------|
| 1 | **Chunk 1** | Docker + Django Scaffolding | — | Must be first. Creates all infrastructure. |
| 2 | **Chunk 2** | Core App (Shared Services) | Chunk 1 | Must be second. All domain apps import from core. |
| 3 | **Chunk 3** | ARES App | Chunks 1, 2 | **CAN RUN IN PARALLEL** with Chunks 4 and 5. |
| 3 | **Chunk 4** | Contacts App | Chunks 1, 2 | **CAN RUN IN PARALLEL** with Chunks 3 and 5. |
| 3 | **Chunk 5** | Justice App | Chunks 1, 2 | **CAN RUN IN PARALLEL** with Chunks 3 and 4. |
| 4 | **Chunk 6** | Frontend Migration | Chunks 1-5 | Must wait for all backend chunks. |
| 5 | **Chunk 7** | Integration Testing | Chunks 1-6 | Final. |

### Visual Timeline
```
Phase 1:  ━━━ Chunk 1: Docker + Scaffold ━━━
Phase 2:  ━━━ Chunk 2: Core App ━━━
Phase 3:  ━━━ Chunk 3: ARES ━━━  ┃  ━━━ Chunk 4: Contacts ━━━  ┃  ━━━ Chunk 5: Justice ━━━
Phase 4:  ━━━ Chunk 6: Frontend Migration ━━━
Phase 5:  ━━━ Chunk 7: Integration Testing ━━━
```

**Serial execution:** 7 chunks sequentially.
**With parallelism:** 5 phases (Chunks 3+4+5 run in 3 parallel context windows in Phase 3).

### Note on Parallel Chunk Merging
Chunks 3, 4, 5 each uncomment their own app in `INSTALLED_APPS` and `urls.py`. If running in parallel, the last chunk to merge will need to ensure all 3 apps are uncommented. Chunk 7 verifies this.
