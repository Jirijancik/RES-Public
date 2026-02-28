import pytest

from company.models import Company
from company.services import CompanyService
from justice.models import Entity
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
            raw_data={"icoId": "12345678"},
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
