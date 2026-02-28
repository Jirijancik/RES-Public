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
