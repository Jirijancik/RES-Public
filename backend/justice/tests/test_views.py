import pytest
from unittest.mock import patch

from rest_framework.test import APIClient

from core.exceptions import ExternalAPIError


MOCK_DOCUMENT_RESULT = {
    "ico": "27082440",
    "documentId": "abc123",
    "documentType": "balance_sheet",
    "textContent": "ROZVAHA v plném rozsahu...",
    "tables": [
        [["Header", "Value"], ["Assets", "1000000"]],
    ],
    "tableCount": 1,
    "sourceUrl": "https://or.justice.cz/ias/content/download?id=abc123",
}

MOCK_CSV_RESULT = [
    {
        "ico": "12345678",
        "name": "Test Company",
        "legal_form": "s.r.o.",
        "address": "Praha",
        "registry_court": "Mestsky soud",
        "file_number": "C 12345",
        "registration_date": "2020-01-01",
    },
]


@pytest.mark.django_db
class TestJusticeDocumentView:
    def setup_method(self):
        self.client = APIClient()
        self.url = "/api/v1/justice/documents/"

    def test_missing_params_returns_400(self):
        response = self.client.get(self.url)
        assert response.status_code == 400

    def test_missing_document_id_returns_400(self):
        response = self.client.get(self.url, {"ico": "27082440"})
        assert response.status_code == 400

    def test_missing_ico_returns_400(self):
        response = self.client.get(self.url, {"document_id": "abc123"})
        assert response.status_code == 400

    @patch("justice.views.JusticeService")
    def test_get_document_success(self, MockService):
        MockService.return_value.get_document.return_value = MOCK_DOCUMENT_RESULT

        response = self.client.get(
            self.url,
            {"ico": "27082440", "document_id": "abc123"},
        )

        assert response.status_code == 200
        assert response.data["ico"] == "27082440"
        assert response.data["documentId"] == "abc123"
        assert response.data["documentType"] == "balance_sheet"
        assert response.data["tableCount"] == 1

    @patch("justice.views.JusticeService")
    def test_get_document_too_large(self, MockService):
        MockService.return_value.get_document.side_effect = ValueError(
            "PDF too large: 55.0MB (max 50MB)"
        )

        response = self.client.get(
            self.url,
            {"ico": "27082440", "document_id": "abc123"},
        )

        assert response.status_code == 400
        assert "too large" in response.data["error"]

    @patch("justice.views.JusticeService")
    def test_get_document_external_error(self, MockService):
        MockService.return_value.get_document.side_effect = ExternalAPIError(
            "Justice document download failed",
            service_name="justice",
        )

        response = self.client.get(
            self.url,
            {"ico": "27082440", "document_id": "abc123"},
        )

        assert response.status_code == 502
        assert response.data["error"] == "Justice document download failed"


@pytest.mark.django_db
class TestJusticeSearchView:
    def setup_method(self):
        self.client = APIClient()
        self.url = "/api/v1/justice/search/"

    def test_missing_dataset_url_returns_400(self):
        response = self.client.get(self.url)
        assert response.status_code == 400

    def test_invalid_url_returns_400(self):
        response = self.client.get(self.url, {"dataset_url": "not-a-url"})
        assert response.status_code == 400

    @patch("justice.views.JusticeService")
    def test_search_success(self, MockService):
        MockService.return_value.import_companies_csv.return_value = MOCK_CSV_RESULT

        response = self.client.get(
            self.url,
            {"dataset_url": "https://dataor.justice.cz/api/file/companies.csv"},
        )

        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]["ico"] == "12345678"
        assert response.data[0]["name"] == "Test Company"

    @patch("justice.views.JusticeService")
    def test_search_external_error(self, MockService):
        MockService.return_value.import_companies_csv.side_effect = ExternalAPIError(
            "Justice open data unavailable",
            service_name="justice",
        )

        response = self.client.get(
            self.url,
            {"dataset_url": "https://dataor.justice.cz/api/file/companies.csv"},
        )

        assert response.status_code == 502
        assert response.data["error"] == "Justice open data unavailable"
