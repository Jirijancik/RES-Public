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
