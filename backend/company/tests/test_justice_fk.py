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
