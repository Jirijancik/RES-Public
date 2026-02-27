# Hub-and-Spoke Multi-Source Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a shared Company hub model that links ARES and Justice data via ICO, enabling unified company lookups and cross-source multi-parameter search (legal form, region, employees, revenue) for the sales team.

**Architecture:** New `company` Django app with a Company model. Phase 1: identity fields (ICO, name, is_active) + FK linking from spokes + every-touch-persists (3-tier lookup: Redis → DB → API, background refresh for stale records, search results persisted to DB). Phase 2: denormalized search fields (legal_form, region_code, employee_category, latest_revenue, nace_primary) populated from ARES/Justice during fetch/sync. New `/api/v1/companies/` endpoints serve unified detail and multi-parameter search.

**Tech Stack:** Django 5.x, Django REST Framework, PostgreSQL, Redis, React/Next.js, TypeScript, React Query

**Design doc:** `docs/plans/2026-02-27-hub-and-spoke-multi-source-design.md`

---

### Task 1: Create the `company` Django app scaffold

**Files:**
- Create: `backend/company/__init__.py`
- Create: `backend/company/apps.py`
- Create: `backend/company/models.py`
- Create: `backend/company/admin.py`
- Create: `backend/company/tests/__init__.py`
- Create: `backend/company/tests/test_models.py`

**Step 1: Create directory structure**

```bash
mkdir -p backend/company/tests
touch backend/company/__init__.py
touch backend/company/tests/__init__.py
```

**Step 2: Write apps.py**

```python
# backend/company/apps.py
from django.apps import AppConfig


class CompanyConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "company"
```

**Step 3: Write the failing test for Company model**

```python
# backend/company/tests/test_models.py
import pytest
from company.models import Company


@pytest.mark.django_db
class TestCompanyModel:
    def test_create_company(self):
        company = Company.objects.create(
            ico="12345678",
            name="Test s.r.o.",
        )
        assert company.ico == "12345678"
        assert company.name == "Test s.r.o."
        assert company.is_active is True
        assert company.created_at is not None
        assert company.updated_at is not None

    def test_ico_unique(self):
        Company.objects.create(ico="12345678", name="First")
        with pytest.raises(Exception):
            Company.objects.create(ico="12345678", name="Second")

    def test_str_representation(self):
        company = Company.objects.create(ico="12345678", name="Test s.r.o.")
        assert str(company) == "Test s.r.o. (12345678)"
```

**Step 4: Run test to verify it fails**

Run: `cd backend && python -m pytest company/tests/test_models.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'company.models'`

**Step 5: Write Company model**

```python
# backend/company/models.py
from django.db import models


class Company(models.Model):
    """Hub entity representing a unique Czech company identified by ICO."""

    ico = models.CharField(max_length=8, unique=True, db_index=True)
    name = models.CharField(max_length=500)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "companies"

    def __str__(self):
        return f"{self.name} ({self.ico})"
```

**Step 6: Write admin.py**

```python
# backend/company/admin.py
from django.contrib import admin
from .models import Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("ico", "name", "is_active", "updated_at")
    search_fields = ("ico", "name")
    list_filter = ("is_active",)
```

**Step 7: Register app in settings**

Modify: `backend/config/settings/base.py:18-34`

Add `"company"` to INSTALLED_APPS, after `"core"` and before `"ares"`:

```python
INSTALLED_APPS = [
    # Django built-ins
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "corsheaders",
    # Your apps
    "core",
    "company",
    "ares",
    "justice",
    "contacts",
]
```

**Step 8: Generate migration and run tests**

```bash
cd backend && python manage.py makemigrations company
cd backend && python -m pytest company/tests/test_models.py -v
```

Expected: All 3 tests PASS.

**Step 9: Commit**

```bash
git add backend/company/ backend/config/settings/base.py
git commit -m "feat(company): create company app with Company hub model"
```

---

### Task 2: Add Company FK to Justice Entity

**Files:**
- Modify: `backend/justice/models.py:23-57`
- Create: `backend/company/tests/test_justice_fk.py`

**Step 1: Write the failing test**

```python
# backend/company/tests/test_justice_fk.py
import pytest
from company.models import Company
from justice.models import Entity


@pytest.mark.django_db
class TestJusticeEntityCompanyFK:
    def test_entity_links_to_company(self):
        company = Company.objects.create(ico="12345678", name="Test s.r.o.")
        entity = Entity.objects.create(
            ico="12345678",
            name="Test s.r.o.",
            company=company,
            dataset_id="sro-actual-praha-2024",
        )
        assert entity.company == company
        assert entity.company_id == company.id

    def test_entity_without_company_ok(self):
        """FK is nullable — existing entities without company still work."""
        entity = Entity.objects.create(
            ico="12345678",
            name="Test s.r.o.",
            company=None,
            dataset_id="sro-actual-praha-2024",
        )
        assert entity.company is None

    def test_company_justice_entities_reverse(self):
        company = Company.objects.create(ico="12345678", name="Test s.r.o.")
        Entity.objects.create(
            ico="12345678", name="Test s.r.o.",
            company=company, dataset_id="sro-actual-praha-2024",
        )
        Entity.objects.create(
            ico="12345678", name="Test s.r.o.",
            company=company, dataset_id="sro-actual-brno-2024",
        )
        assert company.justice_entities.count() == 2
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest company/tests/test_justice_fk.py -v`
Expected: FAIL with `TypeError: Entity() got an unexpected keyword argument 'company'`

**Step 3: Add company FK to Entity model**

Modify `backend/justice/models.py` — add after line 26 (after `ico` field):

```python
company = models.ForeignKey(
    "company.Company",
    on_delete=models.CASCADE,
    related_name="justice_entities",
    null=True,
    blank=True,
)
```

**Step 4: Generate migration and run tests**

```bash
cd backend && python manage.py makemigrations justice
cd backend && python -m pytest company/tests/test_justice_fk.py -v
```

Expected: All 3 tests PASS.

**Step 5: Verify existing Justice tests still pass**

Run: `cd backend && python -m pytest justice/tests/ -v`
Expected: All existing tests PASS (FK is nullable, so no breakage).

**Step 6: Commit**

```bash
git add backend/justice/models.py backend/justice/migrations/ backend/company/tests/
git commit -m "feat(justice): add nullable Company FK to Entity model"
```

---

### Task 3: Add Company FK + timestamps to ARES EconomicSubject

**Files:**
- Modify: `backend/ares/models.py`
- Create: `backend/company/tests/test_ares_fk.py`

**Step 1: Write the failing test**

```python
# backend/company/tests/test_ares_fk.py
import pytest
from company.models import Company
from ares.models import EconomicSubject


@pytest.mark.django_db
class TestAresEconomicSubjectCompanyFK:
    def test_ares_record_links_to_company(self):
        company = Company.objects.create(ico="27082440", name="Alza.cz a.s.")
        record = EconomicSubject.objects.create(
            ico="27082440",
            business_name="Alza.cz a.s.",
            company=company,
        )
        assert record.company == company

    def test_ares_record_without_company_ok(self):
        record = EconomicSubject.objects.create(
            ico="27082440",
            business_name="Alza.cz a.s.",
            company=None,
        )
        assert record.company is None

    def test_company_ares_records_reverse(self):
        company = Company.objects.create(ico="27082440", name="Alza.cz a.s.")
        EconomicSubject.objects.create(
            ico="27082440", business_name="Alza.cz a.s.", company=company,
        )
        assert company.ares_records.count() == 1

    def test_ares_record_has_timestamps(self):
        """Timestamps needed for 3-tier lookup freshness check."""
        record = EconomicSubject.objects.create(
            ico="27082440", business_name="Alza.cz a.s.",
        )
        assert record.created_at is not None
        assert record.updated_at is not None
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest company/tests/test_ares_fk.py -v`
Expected: FAIL with `TypeError: EconomicSubject() got an unexpected keyword argument 'company'`

**Step 3: Add company FK + timestamps to EconomicSubject**

Replace `backend/ares/models.py` content:

```python
from django.db import models


class EconomicSubject(models.Model):
    ico = models.CharField(max_length=8, unique=True, db_index=True)
    business_name = models.CharField(max_length=500)
    raw_data = models.JSONField(default=dict)
    company = models.ForeignKey(
        "company.Company",
        on_delete=models.CASCADE,
        related_name="ares_records",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.ico} - {self.business_name}"
```

**Note:** `updated_at` is used by the 3-tier lookup freshness check — it records when the record was last fetched from ARES.

**Step 4: Generate migration and run tests**

```bash
cd backend && python manage.py makemigrations ares
cd backend && python -m pytest company/tests/test_ares_fk.py -v
```

Expected: All 3 tests PASS.

**Step 5: Verify existing ARES tests still pass**

Run: `cd backend && python -m pytest ares/tests/ -v`
Expected: All existing tests PASS.

**Step 6: Commit**

```bash
git add backend/ares/models.py backend/ares/migrations/ backend/company/tests/
git commit -m "feat(ares): add Company FK + timestamps to EconomicSubject model"
```

---

### Task 4: Data migration — backfill Company from existing Justice entities

**Files:**
- Create: `backend/company/management/__init__.py`
- Create: `backend/company/management/commands/__init__.py`
- Create: `backend/company/management/commands/backfill_companies.py`
- Create: `backend/company/tests/test_backfill.py`

**Step 1: Create management command directories**

```bash
mkdir -p backend/company/management/commands
touch backend/company/management/__init__.py
touch backend/company/management/commands/__init__.py
```

**Step 2: Write the failing test**

```python
# backend/company/tests/test_backfill.py
import pytest
from django.core.management import call_command
from company.models import Company
from justice.models import Entity


@pytest.mark.django_db
class TestBackfillCompanies:
    def test_backfill_creates_companies_from_entities(self):
        """Each unique ICO in Entity gets a Company record."""
        Entity.objects.create(
            ico="12345678", name="Test s.r.o.",
            dataset_id="sro-actual-praha-2024",
        )
        Entity.objects.create(
            ico="12345678", name="Test s.r.o.",
            dataset_id="sro-actual-brno-2024",
        )
        Entity.objects.create(
            ico="87654321", name="Other a.s.",
            dataset_id="as-actual-praha-2024",
        )

        call_command("backfill_companies")

        assert Company.objects.count() == 2
        assert Company.objects.filter(ico="12345678").exists()
        assert Company.objects.filter(ico="87654321").exists()

    def test_backfill_links_entities_to_companies(self):
        """After backfill, all entities have company FK set."""
        Entity.objects.create(
            ico="12345678", name="Test s.r.o.",
            dataset_id="sro-actual-praha-2024",
        )

        call_command("backfill_companies")

        entity = Entity.objects.get(ico="12345678")
        assert entity.company is not None
        assert entity.company.ico == "12345678"

    def test_backfill_idempotent(self):
        """Running backfill twice doesn't create duplicates."""
        Entity.objects.create(
            ico="12345678", name="Test s.r.o.",
            dataset_id="sro-actual-praha-2024",
        )

        call_command("backfill_companies")
        call_command("backfill_companies")

        assert Company.objects.count() == 1
```

**Step 3: Run test to verify it fails**

Run: `cd backend && python -m pytest company/tests/test_backfill.py -v`
Expected: FAIL with `No such command 'backfill_companies'`

**Step 4: Write the management command**

```python
# backend/company/management/commands/backfill_companies.py
"""
Backfill Company hub records from existing Justice entities.

Usage:
    python manage.py backfill_companies
    python manage.py backfill_companies --dry-run
"""
import logging
from django.core.management.base import BaseCommand
from django.db import transaction

from company.models import Company
from justice.models import Entity

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Create Company records for each unique ICO in Justice entities and link them."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without making changes.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        # Find all unique ICOs in Justice entities.
        unique_icos = (
            Entity.objects.values_list("ico", flat=True)
            .distinct()
            .order_by("ico")
        )

        created_count = 0
        linked_count = 0

        for ico in unique_icos:
            if dry_run:
                exists = Company.objects.filter(ico=ico).exists()
                if not exists:
                    self.stdout.write(f"  Would create Company for ICO {ico}")
                    created_count += 1
                continue

            # Get name from most recently updated entity for this ICO.
            entity = Entity.objects.filter(ico=ico).order_by("-updated_at").first()
            if not entity:
                continue

            with transaction.atomic():
                company, was_created = Company.objects.get_or_create(
                    ico=ico,
                    defaults={
                        "name": entity.name,
                        "is_active": entity.is_active,
                    },
                )
                if was_created:
                    created_count += 1

                # Link all entities with this ICO to the company.
                updated = Entity.objects.filter(ico=ico, company__isnull=True).update(
                    company=company
                )
                linked_count += updated

        if dry_run:
            self.stdout.write(f"\nDry run: would create {created_count} companies.")
        else:
            self.stdout.write(
                f"Done: created {created_count} companies, linked {linked_count} entities."
            )
```

**Step 5: Run tests**

Run: `cd backend && python -m pytest company/tests/test_backfill.py -v`
Expected: All 3 tests PASS.

**Step 6: Commit**

```bash
git add backend/company/management/ backend/company/tests/test_backfill.py
git commit -m "feat(company): add backfill_companies management command"
```

---

### Task 5: Update JusticeSyncService to create/link Company during import

**Files:**
- Modify: `backend/justice/services.py:402-429`
- Modify: `backend/justice/tests/test_services.py`

**Step 1: Write the failing test**

Add to `backend/justice/tests/test_services.py`:

```python
# Add import at top:
from company.models import Company

# Add test class at end of file:

@pytest.mark.django_db
class TestJusticeSyncCreatesCompany:
    def test_upsert_entity_creates_company(self):
        """_upsert_entity creates a Company hub record and links the Entity."""
        sync_service = JusticeSyncService(client=MagicMock())

        subjekt = {
            "ico": "12345678",
            "name": "Test s.r.o.",
            "registration_date": "2020-01-15",
            "deletion_date": None,
            "facts": [],
        }
        entity = sync_service._upsert_entity(subjekt, "sro-actual-praha-2024")

        assert entity is not None
        assert entity.company is not None
        assert entity.company.ico == "12345678"
        assert entity.company.name == "Test s.r.o."
        assert Company.objects.count() == 1

    def test_upsert_entity_reuses_existing_company(self):
        """If Company already exists for this ICO, it's reused (not duplicated)."""
        company = Company.objects.create(ico="12345678", name="Old Name")
        sync_service = JusticeSyncService(client=MagicMock())

        subjekt = {
            "ico": "12345678",
            "name": "New Name",
            "facts": [],
        }
        entity = sync_service._upsert_entity(subjekt, "sro-actual-praha-2024")

        assert entity.company_id == company.id
        assert Company.objects.count() == 1
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest justice/tests/test_services.py::TestJusticeSyncCreatesCompany -v`
Expected: FAIL — entity.company is None (not set in current code).

**Step 3: Modify _upsert_entity to create/link Company**

In `backend/justice/services.py`, add import at top (after existing imports around line 30):

```python
from company.models import Company
```

Then modify `_upsert_entity` (line 402-429). Insert Company creation before Entity creation:

```python
def _upsert_entity(self, subjekt: dict, dataset_id: str) -> Entity | None:
    """Create an Entity and all related records from a parsed Subjekt dict."""
    ico = subjekt.get("ico", "").zfill(8)
    if not ico or ico == "00000000":
        return None

    file_ref = self._extract_file_reference(subjekt.get("facts", []))
    legal_form = self._extract_legal_form(subjekt.get("facts", []))

    # Create or get Company hub record.
    company, _ = Company.objects.get_or_create(
        ico=ico,
        defaults={
            "name": subjekt.get("name", ""),
            "is_active": not bool(subjekt.get("deletion_date")),
        },
    )

    entity = Entity.objects.create(
        company=company,
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

    # ... rest of method (fact collection, bulk_create) unchanged ...
```

**Step 4: Run all Justice tests**

Run: `cd backend && python -m pytest justice/tests/test_services.py -v`
Expected: All tests PASS (existing + new).

**Step 5: Commit**

```bash
git add backend/justice/services.py backend/justice/tests/test_services.py
git commit -m "feat(justice): create Company hub record during entity sync"
```

---

### Task 6: Update AresService — 3-tier lookup, search persistence, background refresh

This is the core "every-touch-persists" task. Changes to `AresService`:
1. `get_by_ico()` becomes a 3-tier lookup: Redis → DB → API
2. `search()` persists each result to DB (Company + EconomicSubject)
3. Stale DB records trigger a non-blocking background refresh
4. New constant: `ARES_DB_FRESHNESS_TTL`

**Files:**
- Modify: `backend/ares/services.py`
- Modify: `backend/ares/constants.py`
- Modify: `backend/ares/tests/test_services.py`

**Step 1: Add freshness constant**

In `backend/ares/constants.py`, add:

```python
from datetime import timedelta

ARES_DB_FRESHNESS_TTL = timedelta(hours=24)
```

**Step 2: Write the failing tests**

Add to `backend/ares/tests/test_services.py`:

```python
# Add imports at top:
from datetime import timedelta
from unittest.mock import patch
from django.utils import timezone
from company.models import Company
from ares.models import EconomicSubject

# Add test classes at end of file:

@pytest.mark.django_db
class TestAresServicePersistence:
    def test_get_by_ico_persists_to_db(self):
        """After fetching from API, the record is persisted in EconomicSubject."""
        mock_client = MagicMock()
        mock_client.get_by_ico.return_value = MOCK_DETAIL_RESPONSE

        service = AresService(client=mock_client)
        service.get_by_ico("27082440")

        assert EconomicSubject.objects.filter(ico="27082440").exists()
        record = EconomicSubject.objects.get(ico="27082440")
        assert record.business_name == "Alza.cz a.s."
        assert record.raw_data == MOCK_DETAIL_RESPONSE

    def test_get_by_ico_creates_company(self):
        """Fetching from ARES also creates a Company hub record."""
        mock_client = MagicMock()
        mock_client.get_by_ico.return_value = MOCK_DETAIL_RESPONSE

        service = AresService(client=mock_client)
        service.get_by_ico("27082440")

        assert Company.objects.filter(ico="27082440").exists()
        record = EconomicSubject.objects.get(ico="27082440")
        assert record.company is not None
        assert record.company.ico == "27082440"

    def test_get_by_ico_reuses_existing_company(self):
        """If Company already exists (e.g. from Justice), ARES links to it."""
        existing = Company.objects.create(ico="27082440", name="From Justice")
        mock_client = MagicMock()
        mock_client.get_by_ico.return_value = MOCK_DETAIL_RESPONSE

        service = AresService(client=mock_client)
        service.get_by_ico("27082440")

        record = EconomicSubject.objects.get(ico="27082440")
        assert record.company_id == existing.id
        assert Company.objects.count() == 1

    def test_get_by_ico_db_failure_doesnt_break_response(self):
        """If DB persistence fails, the API response still returns successfully."""
        mock_client = MagicMock()
        mock_client.get_by_ico.return_value = MOCK_DETAIL_RESPONSE

        service = AresService(client=mock_client)

        with patch("ares.services._get_company_model") as mock_get:
            mock_get.return_value.objects.update_or_create.side_effect = Exception("DB down")
            result = service.get_by_ico("27082440")

        # Response still returned from API.
        assert result["icoId"] == "27082440"


@pytest.mark.django_db
class TestAresThreeTierLookup:
    def test_db_hit_skips_api_call(self):
        """If EconomicSubject exists in DB with raw_data, no API call is made."""
        company = Company.objects.create(ico="27082440", name="Alza.cz a.s.")
        EconomicSubject.objects.create(
            ico="27082440",
            business_name="Alza.cz a.s.",
            raw_data=MOCK_DETAIL_RESPONSE,
            company=company,
        )

        mock_client = MagicMock()
        service = AresService(client=mock_client)
        result = service.get_by_ico("27082440")

        # API was NOT called — served from DB
        mock_client.get_by_ico.assert_not_called()
        assert result is not None

    def test_db_miss_calls_api(self):
        """If no DB record exists, API is called and result is persisted."""
        mock_client = MagicMock()
        mock_client.get_by_ico.return_value = MOCK_DETAIL_RESPONSE

        service = AresService(client=mock_client)
        result = service.get_by_ico("27082440")

        mock_client.get_by_ico.assert_called_once_with("27082440")
        assert EconomicSubject.objects.filter(ico="27082440").exists()

    def test_stale_db_record_triggers_background_refresh(self):
        """If DB record is older than FRESHNESS_TTL, background refresh is scheduled."""
        company = Company.objects.create(ico="27082440", name="Alza.cz a.s.")
        record = EconomicSubject.objects.create(
            ico="27082440",
            business_name="Alza.cz a.s.",
            raw_data=MOCK_DETAIL_RESPONSE,
            company=company,
        )
        # Make record stale (older than 24h)
        EconomicSubject.objects.filter(pk=record.pk).update(
            updated_at=timezone.now() - timedelta(hours=25)
        )

        mock_client = MagicMock()
        service = AresService(client=mock_client)

        with patch.object(service, "_schedule_background_refresh") as mock_refresh:
            result = service.get_by_ico("27082440")

        # Result served from DB (stale but instant)
        assert result is not None
        # Background refresh was triggered
        mock_refresh.assert_called_once_with("27082440")

    def test_fresh_db_record_no_background_refresh(self):
        """If DB record is fresh (< FRESHNESS_TTL), no background refresh."""
        company = Company.objects.create(ico="27082440", name="Alza.cz a.s.")
        EconomicSubject.objects.create(
            ico="27082440",
            business_name="Alza.cz a.s.",
            raw_data=MOCK_DETAIL_RESPONSE,
            company=company,
        )
        # Record just created = fresh (updated_at is now)

        mock_client = MagicMock()
        service = AresService(client=mock_client)

        with patch.object(service, "_schedule_background_refresh") as mock_refresh:
            result = service.get_by_ico("27082440")

        mock_refresh.assert_not_called()


@pytest.mark.django_db
class TestAresSearchPersistence:
    def test_search_persists_results_to_db(self):
        """Each entity from search results is persisted as Company + EconomicSubject."""
        mock_client = MagicMock()
        mock_client.search.return_value = MOCK_SEARCH_RESPONSE

        service = AresService(client=mock_client)
        service.search({"name": "Test"})

        # Verify Company and EconomicSubject records were created
        # (exact count depends on MOCK_SEARCH_RESPONSE content)
        assert Company.objects.count() >= 1
        assert EconomicSubject.objects.count() >= 1

    def test_search_does_not_overwrite_existing_company_fields(self):
        """Search uses get_or_create for Company — doesn't overwrite detail-level data."""
        Company.objects.create(
            ico="27082440", name="Full Detail Name", legal_form="121",
        )

        mock_client = MagicMock()
        mock_client.search.return_value = MOCK_SEARCH_RESPONSE

        service = AresService(client=mock_client)
        service.search({"name": "Alza"})

        company = Company.objects.get(ico="27082440")
        assert company.name == "Full Detail Name"  # NOT overwritten by search summary
```

**Step 3: Run tests to verify they fail**

Run: `cd backend && python -m pytest ares/tests/test_services.py::TestAresServicePersistence ares/tests/test_services.py::TestAresThreeTierLookup ares/tests/test_services.py::TestAresSearchPersistence -v`
Expected: FAIL — current code has no DB lookup, no search persistence, no background refresh.

**Step 4: Rewrite AresService**

Replace `backend/ares/services.py`:

```python
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
        self._persist_search_results(result)

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
        """Persist full ARES detail to DB and link to Company hub."""
        try:
            Company = _get_company_model()
            business_name = ""
            records = parsed.get("records", [])
            if records:
                business_name = records[0].get("businessName", "")

            company, _ = Company.objects.update_or_create(
                ico=ico,
                defaults={"name": business_name},
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

    def _persist_search_results(self, result: dict) -> None:
        """Bulk-persist search results to DB (Company + EconomicSubject per entity)."""
        Company = _get_company_model()
        for subject in result.get("economicSubjects", []):
            ico = subject.get("icoId")
            if not ico:
                continue
            try:
                normalized = ico.zfill(8)
                # get_or_create for Company — don't overwrite detail-level data
                company, _ = Company.objects.get_or_create(
                    ico=normalized,
                    defaults={"name": subject.get("businessName", "")},
                )
                EconomicSubject.objects.update_or_create(
                    ico=normalized,
                    defaults={
                        "business_name": subject.get("businessName", ""),
                        "raw_data": subject,
                        "company": company,
                    },
                )
            except Exception:
                logger.warning("Failed to persist search result %s", ico, exc_info=True)
```

**Step 5: Run all ARES tests**

Run: `cd backend && python -m pytest ares/tests/ -v`
Expected: All tests PASS (existing + new).

**Step 6: Commit**

```bash
git add backend/ares/services.py backend/ares/constants.py backend/ares/tests/test_services.py
git commit -m "feat(ares): 3-tier lookup (Redis→DB→API), search persistence, background refresh"
```

---

### Task 7: Create CompanyService for unified lookup

**Files:**
- Create: `backend/company/services.py`
- Create: `backend/company/tests/test_services.py`

**Step 1: Write the failing test**

```python
# backend/company/tests/test_services.py
import pytest
from datetime import date

from company.models import Company
from company.services import CompanyService
from justice.models import Entity, EntityFact
from ares.models import EconomicSubject
from core.exceptions import ExternalAPIError


@pytest.mark.django_db
class TestCompanyServiceGetByIco:
    def test_returns_company_with_both_sources(self):
        company = Company.objects.create(ico="12345678", name="Test s.r.o.")
        Entity.objects.create(
            ico="12345678", name="Test s.r.o.", company=company,
            dataset_id="sro-actual-praha-2024",
        )
        EconomicSubject.objects.create(
            ico="12345678", business_name="Test s.r.o.", company=company,
        )

        service = CompanyService()
        result = service.get_by_ico("12345678")

        assert result["ico"] == "12345678"
        assert result["name"] == "Test s.r.o."
        assert result["sources"]["justice"] is not None
        assert result["sources"]["ares"] is not None

    def test_returns_company_justice_only(self):
        company = Company.objects.create(ico="12345678", name="Test s.r.o.")
        Entity.objects.create(
            ico="12345678", name="Test s.r.o.", company=company,
            dataset_id="sro-actual-praha-2024",
        )

        service = CompanyService()
        result = service.get_by_ico("12345678")

        assert result["sources"]["justice"] is not None
        assert result["sources"]["ares"] is None

    def test_not_found_raises_404(self):
        service = CompanyService()
        with pytest.raises(ExternalAPIError) as exc_info:
            service.get_by_ico("99999999")
        assert exc_info.value.status_code == 404

    def test_pads_ico(self):
        company = Company.objects.create(ico="00123456", name="Test")
        service = CompanyService()
        result = service.get_by_ico("123456")
        assert result["ico"] == "00123456"
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest company/tests/test_services.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'company.services'`

**Step 3: Write CompanyService**

```python
# backend/company/services.py
"""
Company hub business logic — unified lookup across data sources.
"""
from core.exceptions import ExternalAPIError
from core.services.cache import CacheService
from .models import Company

COMPANY_DETAIL_CACHE_TTL = 900  # 15 minutes


class CompanyService:
    def __init__(self):
        self.cache = CacheService(prefix="company", default_ttl=COMPANY_DETAIL_CACHE_TTL)

    def get_by_ico(self, ico: str) -> dict:
        """Return unified company data from all linked sources."""
        normalized = ico.zfill(8)

        cached = self.cache.get("detail", normalized)
        if cached is not None:
            return cached

        try:
            company = Company.objects.get(ico=normalized)
        except Company.DoesNotExist:
            raise ExternalAPIError(
                "Company not found.", status_code=404, service_name="company"
            )

        # Justice data
        justice_entity = (
            company.justice_entities
            .order_by("-updated_at")
            .first()
        )
        justice_data = None
        if justice_entity:
            justice_data = {
                "ico": justice_entity.ico,
                "name": justice_entity.name,
                "legalFormCode": justice_entity.legal_form_code,
                "legalFormName": justice_entity.legal_form_name,
                "courtName": justice_entity.court_name,
                "fileReference": justice_entity.file_reference,
                "registrationDate": (
                    justice_entity.registration_date.isoformat()
                    if justice_entity.registration_date else None
                ),
                "deletionDate": (
                    justice_entity.deletion_date.isoformat()
                    if justice_entity.deletion_date else None
                ),
                "isActive": justice_entity.is_active,
            }

        # ARES data
        ares_record = company.ares_records.first()
        ares_data = None
        if ares_record and ares_record.raw_data:
            ares_data = ares_record.raw_data

        result = {
            "ico": company.ico,
            "name": company.name,
            "isActive": company.is_active,
            "sources": {
                "justice": justice_data,
                "ares": ares_data,
            },
            "createdAt": company.created_at.isoformat(),
            "updatedAt": company.updated_at.isoformat(),
        }

        self.cache.set(result, "detail", normalized, ttl=COMPANY_DETAIL_CACHE_TTL)
        return result
```

**Step 4: Run tests**

Run: `cd backend && python -m pytest company/tests/test_services.py -v`
Expected: All 4 tests PASS.

**Step 5: Commit**

```bash
git add backend/company/services.py backend/company/tests/test_services.py
git commit -m "feat(company): add CompanyService for unified source lookup"
```

---

### Task 8: Create Company API endpoints

**Files:**
- Create: `backend/company/serializers.py`
- Create: `backend/company/views.py`
- Create: `backend/company/urls.py`
- Modify: `backend/config/urls.py`
- Create: `backend/company/tests/test_views.py`

**Step 1: Write the failing test**

```python
# backend/company/tests/test_views.py
import pytest
from django.test import Client

from company.models import Company
from justice.models import Entity
from ares.models import EconomicSubject


@pytest.mark.django_db
class TestCompanyDetailView:
    def test_get_company_detail(self):
        company = Company.objects.create(ico="12345678", name="Test s.r.o.")
        Entity.objects.create(
            ico="12345678", name="Test s.r.o.", company=company,
            dataset_id="sro-actual-praha-2024", legal_form_code="112",
        )
        EconomicSubject.objects.create(
            ico="12345678", business_name="Test s.r.o.", company=company,
            raw_data={"icoId": "12345678"},
        )

        client = Client()
        response = client.get("/api/v1/companies/12345678/")

        assert response.status_code == 200
        data = response.json()
        assert data["ico"] == "12345678"
        assert data["name"] == "Test s.r.o."
        assert data["sources"]["justice"] is not None
        assert data["sources"]["ares"] is not None

    def test_get_company_not_found(self):
        client = Client()
        response = client.get("/api/v1/companies/99999999/")
        assert response.status_code == 404
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest company/tests/test_views.py -v`
Expected: FAIL with 404 (URL not registered).

**Step 3: Write serializers**

```python
# backend/company/serializers.py
"""DRF serializers for Company API. camelCase to match frontend."""
from rest_framework import serializers


class CompanySourcesSerializer(serializers.Serializer):
    justice = serializers.DictField(allow_null=True)
    ares = serializers.DictField(allow_null=True)


class CompanyDetailSerializer(serializers.Serializer):
    ico = serializers.CharField()
    name = serializers.CharField()
    isActive = serializers.BooleanField()
    sources = CompanySourcesSerializer()
    createdAt = serializers.CharField()
    updatedAt = serializers.CharField()
```

**Step 4: Write views**

```python
# backend/company/views.py
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import CompanyDetailSerializer
from .services import CompanyService


class CompanyDetailView(APIView):
    """GET /v1/companies/{ico}/"""

    def get(self, request, ico):
        service = CompanyService()
        result = service.get_by_ico(ico)
        return Response(CompanyDetailSerializer(result).data)
```

**Step 5: Write urls**

```python
# backend/company/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("<str:ico>/", views.CompanyDetailView.as_view(), name="company-detail"),
]
```

**Step 6: Register in root urls.py**

Modify `backend/config/urls.py` — add after line 13 (after justice URL):

```python
path("api/v1/companies/", include("company.urls")),
```

**Step 7: Run tests**

Run: `cd backend && python -m pytest company/tests/test_views.py -v`
Expected: All 2 tests PASS.

**Step 8: Run full test suite**

Run: `cd backend && python -m pytest -v`
Expected: All tests across all apps PASS.

**Step 9: Commit**

```bash
git add backend/company/serializers.py backend/company/views.py backend/company/urls.py backend/config/urls.py backend/company/tests/test_views.py
git commit -m "feat(company): add /api/v1/companies/{ico}/ endpoint"
```

---

### Task 9: Frontend — Company types and API hooks

**Files:**
- Create: `src/lib/company/company.types.ts`
- Create: `src/lib/company/company.endpoints.ts`
- Create: `src/lib/company/company.queries.ts`

**Step 1: Create company types**

```typescript
// src/lib/company/company.types.ts
import type { AresEconomicSubject } from "@/lib/ares/ares.types";
import type { JusticeEntitySummary } from "@/lib/justice/justice.types";

export interface CompanySources {
  justice: JusticeEntitySummary | null;
  ares: Record<string, unknown> | null;
}

export interface CompanyDetail {
  ico: string;
  name: string;
  isActive: boolean;
  sources: CompanySources;
  createdAt: string;
  updatedAt: string;
}
```

**Step 2: Create API endpoint function**

Check existing endpoint patterns first — reference `src/lib/ares/ares.endpoints.ts` and `src/lib/justice/justice.endpoints.ts` for the project's HTTP client pattern.

```typescript
// src/lib/company/company.endpoints.ts
import type { CompanyDetail } from "./company.types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchCompanyByIco(ico: string): Promise<CompanyDetail> {
  const normalized = ico.padStart(8, "0");
  const response = await fetch(`${API_BASE}/api/v1/companies/${normalized}/`);

  if (!response.ok) {
    throw new Error(`Company fetch failed: ${response.status}`);
  }

  return response.json();
}
```

**Step 3: Create React Query hook**

Check existing query patterns in `src/lib/ares/ares.queries.ts` and `src/lib/justice/justice.queries.ts`.

```typescript
// src/lib/company/company.queries.ts
import { useQuery } from "@tanstack/react-query";
import { fetchCompanyByIco } from "./company.endpoints";

export const companyKeys = {
  all: ["company"] as const,
  detail: (ico: string) => [...companyKeys.all, "detail", ico] as const,
};

export function useCompanyByIco(ico: string) {
  return useQuery({
    queryKey: companyKeys.detail(ico),
    queryFn: () => fetchCompanyByIco(ico),
    enabled: !!ico,
  });
}
```

**Step 4: Commit**

```bash
git add src/lib/company/
git commit -m "feat(company): add frontend types, endpoints, and React Query hooks"
```

---

### Task 10: Frontend — Company detail page

**Files:**
- Create: `src/app/companies/[ico]/page.tsx`
- Create: `src/components/company/company-detail.tsx`

**Step 1: Create the page route**

Check existing page patterns — reference `src/app/justice/[ico]/page.tsx`.

```typescript
// src/app/companies/[ico]/page.tsx
import { CompanyDetail } from "@/components/company/company-detail";

interface Props {
  params: Promise<{ ico: string }>;
}

export default async function CompanyPage({ params }: Props) {
  const { ico } = await params;
  return <CompanyDetail ico={ico} />;
}
```

**Step 2: Create CompanyDetail component**

Reference the existing `src/components/justice/justice-detail.tsx` for patterns (Card, collapsible sections, etc.). Build a minimal working version first — styling can be refined later.

```typescript
// src/components/company/company-detail.tsx
"use client";

import { useCompanyByIco } from "@/lib/company/company.queries";

interface Props {
  ico: string;
}

export function CompanyDetail({ ico }: Props) {
  const { data, isLoading, error } = useCompanyByIco(ico);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading company data...</div>;
  }

  if (error || !data) {
    return <div className="p-8 text-center text-destructive">Company not found.</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{data.name}</h1>
        <p className="text-muted-foreground">ICO: {data.ico}</p>
        <span className={`text-sm ${data.isActive ? "text-green-500" : "text-red-500"}`}>
          {data.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Justice section */}
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Justice Registry</h2>
          {data.sources.justice ? (
            <dl className="space-y-1 text-sm">
              <div><dt className="text-muted-foreground inline">Legal Form:</dt> {data.sources.justice.legalFormName}</div>
              <div><dt className="text-muted-foreground inline">Court:</dt> {data.sources.justice.courtName}</div>
              <div><dt className="text-muted-foreground inline">File Ref:</dt> {data.sources.justice.fileReference}</div>
              <div><dt className="text-muted-foreground inline">Registered:</dt> {data.sources.justice.registrationDate}</div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No Justice data available.</p>
          )}
        </div>

        {/* ARES section */}
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">ARES Registry</h2>
          {data.sources.ares ? (
            <p className="text-sm text-muted-foreground">ARES data available. Raw data stored.</p>
          ) : (
            <p className="text-sm text-muted-foreground">No ARES data available.</p>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Last updated: {new Date(data.updatedAt).toLocaleDateString()}
      </p>
    </div>
  );
}
```

**Step 3: Verify it builds**

Run: `npm run build` (or `pnpm build` depending on project setup)
Expected: Build completes without TypeScript errors.

**Step 4: Commit**

```bash
git add src/app/companies/ src/components/company/
git commit -m "feat(company): add /companies/[ico] detail page"
```

---

### Task 11: Run migrations and full verification

**Step 1: Apply all migrations**

```bash
cd backend && python manage.py migrate
```

Expected: All migrations apply cleanly.

**Step 2: Run full backend test suite**

```bash
cd backend && python -m pytest -v
```

Expected: All tests PASS across company, ares, justice, and contacts apps.

**Step 3: Run frontend build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 4: Final commit**

```bash
git add -A && git status
```

If there are any remaining untracked files (migration files, etc.), add and commit:

```bash
git commit -m "chore: apply all hub-and-spoke migrations"
```

---

## Phase 2: Denormalized Search Fields

> **Purpose:** Enable multi-parameter cross-source filtering (legal form + region + employees + revenue) for sales team use cases.
> Depends on Phase 1 being complete.

---

### Task 12: Add search columns to Company model

**Files:**
- Modify: `backend/company/models.py`
- Modify: `backend/company/admin.py`
- Create: `backend/company/tests/test_search_fields.py`

**Step 1: Write the failing test**

```python
# backend/company/tests/test_search_fields.py
import pytest
from decimal import Decimal

from company.models import Company


@pytest.mark.django_db
class TestCompanySearchFields:
    def test_create_company_with_search_fields(self):
        company = Company.objects.create(
            ico="12345678",
            name="Test s.r.o.",
            legal_form="112",
            region_code=19,
            region_name="Hlavní město Praha",
            employee_category="10-19",
            latest_revenue=Decimal("5234000.00"),
            nace_primary="62010",
        )
        company.refresh_from_db()
        assert company.legal_form == "112"
        assert company.region_code == 19
        assert company.region_name == "Hlavní město Praha"
        assert company.employee_category == "10-19"
        assert company.latest_revenue == Decimal("5234000.00")
        assert company.nace_primary == "62010"

    def test_search_fields_are_optional(self):
        """Search fields default to empty/null — Phase 1 companies still work."""
        company = Company.objects.create(ico="12345678", name="Test")
        company.refresh_from_db()
        assert company.legal_form == ""
        assert company.region_code is None
        assert company.employee_category == ""
        assert company.latest_revenue is None
        assert company.nace_primary == ""

    def test_filter_by_legal_form(self):
        Company.objects.create(ico="11111111", name="SRO Co", legal_form="112")
        Company.objects.create(ico="22222222", name="AS Co", legal_form="121")

        results = Company.objects.filter(legal_form="112")
        assert results.count() == 1
        assert results.first().name == "SRO Co"

    def test_filter_by_region_code(self):
        Company.objects.create(ico="11111111", name="Prague Co", region_code=19)
        Company.objects.create(ico="22222222", name="Brno Co", region_code=64)

        results = Company.objects.filter(region_code=19)
        assert results.count() == 1
        assert results.first().name == "Prague Co"

    def test_filter_by_revenue_range(self):
        Company.objects.create(ico="11111111", name="Small", latest_revenue=Decimal("100000"))
        Company.objects.create(ico="22222222", name="Medium", latest_revenue=Decimal("5000000"))
        Company.objects.create(ico="33333333", name="Large", latest_revenue=Decimal("50000000"))

        results = Company.objects.filter(
            latest_revenue__gte=Decimal("1000000"),
            latest_revenue__lte=Decimal("10000000"),
        )
        assert results.count() == 1
        assert results.first().name == "Medium"

    def test_composite_multi_param_filter(self):
        """The core sales use case: filter by legal_form + region + employees + revenue."""
        Company.objects.create(
            ico="11111111", name="Target Co",
            legal_form="112", region_code=19,
            employee_category="10-19", latest_revenue=Decimal("5000000"),
        )
        Company.objects.create(
            ico="22222222", name="Wrong Region",
            legal_form="112", region_code=64,
            employee_category="10-19", latest_revenue=Decimal("5000000"),
        )
        Company.objects.create(
            ico="33333333", name="Wrong Form",
            legal_form="121", region_code=19,
            employee_category="10-19", latest_revenue=Decimal("5000000"),
        )
        Company.objects.create(
            ico="44444444", name="Low Revenue",
            legal_form="112", region_code=19,
            employee_category="10-19", latest_revenue=Decimal("100000"),
        )

        results = Company.objects.filter(
            legal_form="112",
            region_code=19,
            employee_category="10-19",
            latest_revenue__gte=Decimal("1000000"),
        )
        assert results.count() == 1
        assert results.first().name == "Target Co"
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest company/tests/test_search_fields.py -v`
Expected: FAIL — Company model doesn't have `legal_form` etc. fields yet.

**Step 3: Add search fields to Company model**

In `backend/company/models.py`, add after the `updated_at` field:

```python
    # --- Denormalized search fields (Phase 2) ---
    # Populated from ARES/Justice during fetch/sync for fast multi-param filtering.
    legal_form = models.CharField(max_length=10, blank=True, default="", db_index=True)
    region_code = models.IntegerField(null=True, blank=True, db_index=True)
    region_name = models.CharField(max_length=100, blank=True, default="")
    employee_category = models.CharField(max_length=50, blank=True, default="", db_index=True)
    latest_revenue = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True, db_index=True
    )
    nace_primary = models.CharField(max_length=10, blank=True, default="", db_index=True)
```

Also add to Meta class:

```python
    class Meta:
        verbose_name_plural = "companies"
        indexes = [
            models.Index(
                fields=["legal_form", "region_code"],
                name="idx_company_form_region",
            ),
        ]
```

**Step 4: Update admin.py**

```python
@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("ico", "name", "legal_form", "region_name", "employee_category", "is_active", "updated_at")
    search_fields = ("ico", "name")
    list_filter = ("is_active", "legal_form", "region_code", "employee_category")
```

**Step 5: Create and apply migration**

```bash
cd backend && python manage.py makemigrations company && python manage.py migrate
```

**Step 6: Run tests**

Run: `cd backend && python -m pytest company/tests/test_search_fields.py -v`
Expected: All 6 tests PASS.

**Step 7: Commit**

```bash
git add backend/company/
git commit -m "feat(company): add denormalized search fields for multi-param filtering"
```

---

### Task 13: Update ARES persistence to populate search fields

**Files:**
- Modify: `backend/ares/services.py`
- Modify: `backend/ares/tests/test_services.py`

**Step 1: Write the failing test**

Add to `backend/ares/tests/test_services.py`:

```python
# Extended ARES mock with search-relevant fields
MOCK_DETAIL_WITH_STATS = {
    "ico": "27082440",
    "icoId": "27082440",
    "obchodniJmeno": "Alza.cz a.s.",
    "sidlo": {
        "kodKraje": 19,
        "nazevKraje": "Hlavní město Praha",
    },
    "czNace": ["47910"],
    "statistickeUdaje": {
        "kategoriePoctuPracovniku": "500-999",
    },
    "pravniForma": "121",
}


@pytest.mark.django_db
class TestAresSearchFieldPopulation:
    def test_persist_populates_search_fields_on_company(self):
        """ARES fetch extracts region, employees, NACE, legal form onto Company."""
        mock_client = MagicMock()
        mock_client.get_by_ico.return_value = MOCK_DETAIL_WITH_STATS

        # The parser needs to extract these into the parsed result.
        # Adjust MOCK based on what parse_economic_subject actually returns.
        service = AresService(client=mock_client)
        service.get_by_ico("27082440")

        company = Company.objects.get(ico="27082440")
        assert company.legal_form == "121"
        assert company.region_code == 19
        assert company.region_name == "Hlavní město Praha"
        assert company.employee_category == "500-999"
        assert company.nace_primary == "47910"

    def test_persist_updates_search_fields_on_refetch(self):
        """Second ARES fetch updates search fields (not just get_or_create)."""
        Company.objects.create(
            ico="27082440", name="Old Name", legal_form="112",
        )

        mock_client = MagicMock()
        mock_client.get_by_ico.return_value = MOCK_DETAIL_WITH_STATS

        service = AresService(client=mock_client)
        service.get_by_ico("27082440")

        company = Company.objects.get(ico="27082440")
        # Should be updated to ARES values
        assert company.legal_form == "121"
        assert company.region_code == 19
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest ares/tests/test_services.py::TestAresSearchFieldPopulation -v`
Expected: FAIL — `_persist_detail()` doesn't extract search fields yet.

**Step 3: Update `_persist_detail()` in `backend/ares/services.py`**

Update the method (created in Task 6) to extract search fields from the parsed ARES response and pass them as Company defaults:

```python
def _persist_detail(self, ico: str, parsed: dict, raw: dict) -> None:
    """Persist full ARES detail to DB and update Company search fields."""
    try:
        Company = _get_company_model()
        records = parsed.get("records", [])
        record = records[0] if records else {}
        headquarters = record.get("headquarters", {}) or {}
        stats = record.get("statisticalData", {}) or {}

        business_name = record.get("businessName", "")

        company_defaults = {
            "name": business_name,
            "legal_form": record.get("legalForm", "") or "",
            "region_code": headquarters.get("regionCode"),
            "region_name": headquarters.get("regionName", "") or "",
            "employee_category": stats.get("employeeCountCategory", "") or "",
            "nace_primary": (record.get("naceActivities") or [""])[0],
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
```

**Step 4: Run all ARES tests**

Run: `cd backend && python -m pytest ares/tests/ -v`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add backend/ares/services.py backend/ares/tests/test_services.py
git commit -m "feat(ares): populate Company search fields during ARES fetch"
```

---

### Task 14: Update Justice sync to populate search fields

**Files:**
- Modify: `backend/justice/services.py`
- Modify: `backend/justice/tests/test_services.py`

**Step 1: Write the failing test**

Add to `backend/justice/tests/test_services.py`:

```python
from company.models import Company


@pytest.mark.django_db
class TestJusticeSyncPopulatesSearchFields:
    def test_upsert_entity_sets_legal_form_on_company(self):
        """Justice sync writes legal_form to Company if not already set."""
        sync_service = JusticeSyncService(client=MagicMock())

        subjekt = {
            "ico": "12345678",
            "name": "Test s.r.o.",
            "facts": [
                {
                    "header": "Právní forma",
                    "fact_type_code": "PRAVNI_FORMA",
                    "value_text": "Společnost s ručením omezeným",
                    "code": "112",
                    "sub_facts": [],
                }
            ],
        }
        entity = sync_service._upsert_entity(subjekt, "sro-actual-praha-2024")

        company = Company.objects.get(ico="12345678")
        assert company.legal_form == "112"

    def test_upsert_entity_does_not_overwrite_ares_legal_form(self):
        """If Company already has legal_form from ARES, Justice doesn't overwrite."""
        Company.objects.create(ico="12345678", name="Test", legal_form="112")

        sync_service = JusticeSyncService(client=MagicMock())
        subjekt = {
            "ico": "12345678",
            "name": "Test s.r.o.",
            "facts": [],
        }
        sync_service._upsert_entity(subjekt, "sro-actual-praha-2024")

        company = Company.objects.get(ico="12345678")
        assert company.legal_form == "112"  # Unchanged
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest justice/tests/test_services.py::TestJusticeSyncPopulatesSearchFields -v`
Expected: FAIL — `_upsert_entity` doesn't set `legal_form` on Company.

**Step 3: Modify `_upsert_entity()` in `backend/justice/services.py`**

After the `Company.objects.get_or_create(...)` call, add:

```python
    # Phase 2: Populate search fields from Justice if not already set by ARES.
    update_fields = {}
    legal_form_code = legal_form.get("code", "") if legal_form else ""
    if legal_form_code and not company.legal_form:
        update_fields["legal_form"] = legal_form_code
    if update_fields:
        Company.objects.filter(pk=company.pk).update(**update_fields)
```

**Step 4: Run all Justice tests**

Run: `cd backend && python -m pytest justice/tests/ -v`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add backend/justice/services.py backend/justice/tests/test_services.py
git commit -m "feat(justice): populate Company.legal_form during entity sync"
```

---

### Task 15: Company search endpoint and service

**Files:**
- Modify: `backend/company/services.py`
- Create: `backend/company/tests/test_search.py`
- Modify: `backend/company/serializers.py`
- Modify: `backend/company/views.py`
- Modify: `backend/company/urls.py`

**Step 1: Write the failing test for CompanyService.search()**

```python
# backend/company/tests/test_search.py
import pytest
from decimal import Decimal

from company.models import Company
from company.services import CompanyService
from core.exceptions import ExternalAPIError


def _create_company(**overrides):
    defaults = {
        "ico": "12345678",
        "name": "Test s.r.o.",
        "legal_form": "112",
        "region_code": 19,
        "region_name": "Hlavní město Praha",
        "employee_category": "10-19",
        "latest_revenue": Decimal("5000000"),
        "nace_primary": "62010",
    }
    defaults.update(overrides)
    return Company.objects.create(**defaults)


@pytest.mark.django_db
class TestCompanySearch:
    def test_search_by_legal_form(self):
        _create_company(ico="11111111", legal_form="112")
        _create_company(ico="22222222", legal_form="121")

        service = CompanyService()
        result = service.search({"legalForm": "112"})

        assert result["totalCount"] == 1
        assert result["companies"][0]["ico"] == "11111111"

    def test_search_by_region(self):
        _create_company(ico="11111111", region_code=19)
        _create_company(ico="22222222", region_code=64)

        service = CompanyService()
        result = service.search({"regionCode": 19})

        assert result["totalCount"] == 1
        assert result["companies"][0]["ico"] == "11111111"

    def test_search_by_employee_category(self):
        _create_company(ico="11111111", employee_category="10-19")
        _create_company(ico="22222222", employee_category="50-99")

        service = CompanyService()
        result = service.search({"employeeCategory": "10-19"})

        assert result["totalCount"] == 1

    def test_search_by_revenue_range(self):
        _create_company(ico="11111111", latest_revenue=Decimal("100000"))
        _create_company(ico="22222222", latest_revenue=Decimal("5000000"))
        _create_company(ico="33333333", latest_revenue=Decimal("50000000"))

        service = CompanyService()
        result = service.search({"revenueMin": 1000000, "revenueMax": 10000000})

        assert result["totalCount"] == 1
        assert result["companies"][0]["ico"] == "22222222"

    def test_search_multi_param_composite(self):
        """The core sales use case."""
        _create_company(ico="11111111", name="Target")
        _create_company(ico="22222222", name="Wrong Region", region_code=64)
        _create_company(ico="33333333", name="Wrong Form", legal_form="121")

        service = CompanyService()
        result = service.search({
            "legalForm": "112",
            "regionCode": 19,
            "employeeCategory": "10-19",
            "revenueMin": 1000000,
        })

        assert result["totalCount"] == 1
        assert result["companies"][0]["name"] == "Target"

    def test_search_pagination(self):
        for i in range(10):
            _create_company(
                ico=f"1000000{i}",
                name=f"Company {i:02d}",
                latest_revenue=Decimal(str((i + 1) * 1000000)),
            )

        service = CompanyService()
        result = service.search({"offset": 2, "limit": 3})

        assert result["totalCount"] == 10
        assert result["offset"] == 2
        assert result["limit"] == 3
        assert len(result["companies"]) == 3

    def test_search_by_name(self):
        _create_company(ico="11111111", name="Alpha Corp")
        _create_company(ico="22222222", name="Beta Inc")

        service = CompanyService()
        result = service.search({"name": "Alpha"})

        assert result["totalCount"] == 1
        assert result["companies"][0]["name"] == "Alpha Corp"

    def test_search_active_filter(self):
        _create_company(ico="11111111", is_active=True)
        _create_company(ico="22222222", is_active=False)

        service = CompanyService()

        active = service.search({"status": "active"})
        assert active["totalCount"] == 1

        inactive = service.search({"status": "inactive"})
        assert inactive["totalCount"] == 1

        all_results = service.search({})
        assert all_results["totalCount"] == 2
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest company/tests/test_search.py -v`
Expected: FAIL — CompanyService has no `search()` method.

**Step 3: Add `search()` method to CompanyService**

In `backend/company/services.py`, add:

```python
    def search(self, params: dict) -> dict:
        """Multi-parameter search across denormalized Company fields."""
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

**Step 4: Add search serializer and view**

In `backend/company/serializers.py`, add:

```python
class CompanySearchRequestSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=True)
    legalForm = serializers.CharField(required=False)
    regionCode = serializers.IntegerField(required=False)
    employeeCategory = serializers.CharField(required=False)
    revenueMin = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    revenueMax = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    nace = serializers.CharField(required=False)
    status = serializers.ChoiceField(choices=["active", "inactive", "all"], required=False)
    offset = serializers.IntegerField(required=False, min_value=0)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=100)


class CompanySummarySerializer(serializers.Serializer):
    ico = serializers.CharField()
    name = serializers.CharField()
    isActive = serializers.BooleanField()
    legalForm = serializers.CharField()
    regionCode = serializers.IntegerField(allow_null=True)
    regionName = serializers.CharField()
    employeeCategory = serializers.CharField()
    latestRevenue = serializers.CharField(allow_null=True)
    nacePrimary = serializers.CharField()


class CompanySearchResultSerializer(serializers.Serializer):
    totalCount = serializers.IntegerField()
    offset = serializers.IntegerField()
    limit = serializers.IntegerField()
    companies = CompanySummarySerializer(many=True)
```

In `backend/company/views.py`, add:

```python
from .serializers import CompanyDetailSerializer, CompanySearchRequestSerializer, CompanySearchResultSerializer


class CompanySearchView(APIView):
    """GET /v1/companies/search/?legalForm=112&regionCode=19&..."""

    def get(self, request):
        serializer = CompanySearchRequestSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        service = CompanyService()
        result = service.search(serializer.validated_data)

        return Response(CompanySearchResultSerializer(result).data)
```

In `backend/company/urls.py`, add the search route:

```python
from django.urls import path
from . import views

urlpatterns = [
    path("search/", views.CompanySearchView.as_view(), name="company-search"),
    path("<str:ico>/", views.CompanyDetailView.as_view(), name="company-detail"),
]
```

**Step 5: Write view-level test**

Add to `backend/company/tests/test_views.py`:

```python
@pytest.mark.django_db
class TestCompanySearchView:
    def test_search_with_filters(self):
        Company.objects.create(
            ico="12345678", name="Target s.r.o.",
            legal_form="112", region_code=19,
            employee_category="10-19", latest_revenue=Decimal("5000000"),
        )
        Company.objects.create(
            ico="99999999", name="Other a.s.",
            legal_form="121", region_code=64,
        )

        client = Client()
        response = client.get(
            "/api/v1/companies/search/",
            {"legalForm": "112", "regionCode": 19},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["totalCount"] == 1
        assert data["companies"][0]["ico"] == "12345678"

    def test_search_empty_returns_all(self):
        Company.objects.create(ico="11111111", name="A")
        Company.objects.create(ico="22222222", name="B")

        client = Client()
        response = client.get("/api/v1/companies/search/")

        assert response.status_code == 200
        assert response.json()["totalCount"] == 2
```

**Step 6: Run all tests**

Run: `cd backend && python -m pytest company/tests/ -v`
Expected: All tests PASS.

**Step 7: Commit**

```bash
git add backend/company/
git commit -m "feat(company): add multi-parameter search endpoint /api/v1/companies/search/"
```

---

### Task 16: Frontend — Company search types and page

**Files:**
- Modify: `src/lib/company/company.types.ts`
- Modify: `src/lib/company/company.endpoints.ts`
- Modify: `src/lib/company/company.queries.ts`
- Create: `src/app/companies/search/page.tsx`
- Create: `src/components/company/company-search.tsx`

**Step 1: Update TypeScript types**

Add to `src/lib/company/company.types.ts`:

```typescript
export interface CompanySummary {
  ico: string;
  name: string;
  isActive: boolean;
  legalForm: string;
  regionCode: number | null;
  regionName: string;
  employeeCategory: string;
  latestRevenue: string | null;
  nacePrimary: string;
}

export interface CompanySearchResult {
  totalCount: number;
  offset: number;
  limit: number;
  companies: CompanySummary[];
}

export interface CompanySearchParams {
  name?: string;
  legalForm?: string;
  regionCode?: number;
  employeeCategory?: string;
  revenueMin?: number;
  revenueMax?: number;
  nace?: string;
  status?: "active" | "inactive" | "all";
  offset?: number;
  limit?: number;
}
```

**Step 2: Add search endpoint function**

Add to `src/lib/company/company.endpoints.ts`:

```typescript
import type { CompanySearchResult, CompanySearchParams } from "./company.types";

export async function searchCompanies(params: CompanySearchParams): Promise<CompanySearchResult> {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const response = await fetch(`${API_BASE}/api/v1/companies/search/?${searchParams}`);

  if (!response.ok) {
    throw new Error(`Company search failed: ${response.status}`);
  }

  return response.json();
}
```

**Step 3: Add React Query hook**

Add to `src/lib/company/company.queries.ts`:

```typescript
import { searchCompanies } from "./company.endpoints";
import type { CompanySearchParams } from "./company.types";

export const companyKeys = {
  all: ["company"] as const,
  detail: (ico: string) => [...companyKeys.all, "detail", ico] as const,
  search: (params: CompanySearchParams) => [...companyKeys.all, "search", params] as const,
};

export function useCompanySearch(params: CompanySearchParams) {
  return useQuery({
    queryKey: companyKeys.search(params),
    queryFn: () => searchCompanies(params),
  });
}
```

**Step 4: Create search page route**

```typescript
// src/app/companies/search/page.tsx
import { CompanySearch } from "@/components/company/company-search";

export default function CompanySearchPage() {
  return <CompanySearch />;
}
```

**Step 5: Create CompanySearch component**

Reference existing search patterns in the project. Build a filter sidebar + results table component. This is a UI-heavy component — adjust to match the project's existing design system (shadcn/ui, Tailwind classes, etc.).

```typescript
// src/components/company/company-search.tsx
"use client";

import { useState } from "react";
import { useCompanySearch } from "@/lib/company/company.queries";
import type { CompanySearchParams } from "@/lib/company/company.types";

export function CompanySearch() {
  const [params, setParams] = useState<CompanySearchParams>({
    status: "active",
    limit: 25,
    offset: 0,
  });

  const { data, isLoading } = useCompanySearch(params);

  // Render filter controls + results table.
  // Filters: legalForm dropdown, regionCode dropdown, employeeCategory dropdown,
  //          revenueMin/revenueMax inputs, name text input.
  // Results: table with columns: ICO, Name, Legal Form, Region, Employees, Revenue, NACE.
  // Pagination: offset/limit controls.

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Company Search</h1>
      {/* Filter sidebar and results table - implement using project's UI components */}
      {isLoading && <p>Loading...</p>}
      {data && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            {data.totalCount} companies found
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">ICO</th>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Legal Form</th>
                <th className="text-left p-2">Region</th>
                <th className="text-left p-2">Employees</th>
                <th className="text-right p-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.companies.map((c) => (
                <tr key={c.ico} className="border-b hover:bg-muted/50">
                  <td className="p-2 font-mono">{c.ico}</td>
                  <td className="p-2">{c.name}</td>
                  <td className="p-2">{c.legalForm}</td>
                  <td className="p-2">{c.regionName}</td>
                  <td className="p-2">{c.employeeCategory}</td>
                  <td className="p-2 text-right">
                    {c.latestRevenue ? Number(c.latestRevenue).toLocaleString("cs-CZ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

**Step 6: Verify build**

Run: `npm run build`
Expected: Build completes without TypeScript errors.

**Step 7: Commit**

```bash
git add src/lib/company/ src/app/companies/search/ src/components/company/
git commit -m "feat(company): add multi-parameter search page /companies/search"
```

---

### Task 17: Phase 2 verification and final commit

**Step 1: Run full backend test suite**

```bash
cd backend && python -m pytest -v
```

Expected: All tests PASS across all apps.

**Step 2: Run frontend build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Apply any pending migrations**

```bash
cd backend && python manage.py migrate
```

**Step 4: Final commit**

```bash
git add -A && git status
git commit -m "chore: Phase 2 search hub complete — multi-parameter filtering ready"
```
