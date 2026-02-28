import pytest
from decimal import Decimal
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
