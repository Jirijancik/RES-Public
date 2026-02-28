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
