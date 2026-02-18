import pytest
from unittest.mock import patch, MagicMock

from django.test import override_settings
from rest_framework.test import APIClient

from core.exceptions import ExternalAPIError


MOCK_SEARCH_RESULT = {
    "totalCount": 1,
    "economicSubjects": [
        {
            "icoId": "27082440",
            "records": [
                {
                    "ico": "27082440",
                    "businessName": "Alza.cz a.s.",
                    "headquarters": None,
                    "legalForm": "121",
                    "isPrimaryRecord": True,
                }
            ],
        }
    ],
}

MOCK_DETAIL_RESULT = {
    "icoId": "27082440",
    "records": [
        {
            "ico": "27082440",
            "businessName": "Alza.cz a.s.",
            "headquarters": None,
            "legalForm": "121",
            "isPrimaryRecord": True,
        }
    ],
}


@pytest.mark.django_db
class TestAresSearchView:
    def setup_method(self):
        self.client = APIClient()
        self.url = "/api/v1/ares/search/"

    @patch("ares.views.AresService")
    def test_search_success(self, MockService):
        MockService.return_value.search.return_value = MOCK_SEARCH_RESULT

        response = self.client.post(
            self.url,
            {"businessName": "Alza", "count": 1},
            format="json",
        )

        assert response.status_code == 200
        assert response.data["totalCount"] == 1
        assert len(response.data["economicSubjects"]) == 1

    @patch("ares.views.AresService")
    def test_search_with_location(self, MockService):
        MockService.return_value.search.return_value = MOCK_SEARCH_RESULT

        response = self.client.post(
            self.url,
            {
                "businessName": "Alza",
                "location": {"regionCode": 19},
            },
            format="json",
        )

        assert response.status_code == 200

    def test_search_invalid_count(self):
        response = self.client.post(
            self.url,
            {"businessName": "Alza", "count": 0},
            format="json",
        )

        assert response.status_code == 400

    @patch("ares.views.AresService")
    def test_search_external_error(self, MockService):
        MockService.return_value.search.side_effect = ExternalAPIError(
            "ARES service is temporarily unavailable",
            status_code=502,
            service_name="ares",
        )

        response = self.client.post(
            self.url,
            {"businessName": "Alza"},
            format="json",
        )

        assert response.status_code == 502
        assert response.data["error"] == "ARES service is temporarily unavailable"


@pytest.mark.django_db
class TestAresSubjectDetailView:
    def setup_method(self):
        self.client = APIClient()

    @patch("ares.views.AresService")
    def test_get_by_ico_success(self, MockService):
        MockService.return_value.get_by_ico.return_value = MOCK_DETAIL_RESULT

        response = self.client.get("/api/v1/ares/subjects/27082440/")

        assert response.status_code == 200
        assert response.data["icoId"] == "27082440"
        assert len(response.data["records"]) == 1

    @patch("ares.views.AresService")
    def test_get_by_ico_not_found(self, MockService):
        MockService.return_value.get_by_ico.side_effect = ExternalAPIError(
            "Economic subject not found",
            status_code=404,
            service_name="ares",
        )

        response = self.client.get("/api/v1/ares/subjects/99999999/")

        assert response.status_code == 404
        assert response.data["error"] == "Economic subject not found"
