import pytest
from decimal import Decimal

from company.models import Company
from company.services import CompanyService


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
