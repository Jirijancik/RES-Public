"""
Tests for the Justice API views (7 endpoints).

Uses pytest + pytest-django. Views are tested by mocking JusticeService so
that the view layer is isolated from DB / business logic concerns.
"""
import pytest
from unittest.mock import patch

from rest_framework.test import APIClient

from core.exceptions import ExternalAPIError


# ---------------------------------------------------------------------------
# Sample response dicts (camelCase, matching serializer shapes)
# ---------------------------------------------------------------------------

MOCK_ENTITY_DETAIL = {
    "ico": "12345678",
    "name": "Test s.r.o.",
    "legalFormCode": "112",
    "legalFormName": "s.r.o.",
    "courtCode": "MSPH",
    "courtName": "Mestsky soud v Praze",
    "fileSection": "C",
    "fileNumber": 231666,
    "fileReference": "C 231666/MSPH",
    "registrationDate": "2020-01-15",
    "deletionDate": None,
    "isActive": True,
    "facts": [
        {
            "header": "Sidlo",
            "factTypeCode": "SIDLO",
            "factTypeName": "Sidlo",
            "valueText": "",
            "valueData": None,
            "registrationDate": "2020-01-15",
            "deletionDate": None,
            "functionName": "",
            "functionFrom": None,
            "functionTo": None,
            "person": None,
            "addresses": [],
            "subFacts": [],
        }
    ],
}

MOCK_SEARCH_RESULT = {
    "totalCount": 1,
    "offset": 0,
    "limit": 20,
    "entities": [
        {
            "ico": "12345678",
            "name": "Test s.r.o.",
            "legalFormCode": "112",
            "legalFormName": "s.r.o.",
            "courtName": "Mestsky soud v Praze",
            "fileReference": "C 231666/MSPH",
            "registrationDate": "2020-01-15",
            "deletionDate": None,
            "isActive": True,
        }
    ],
}

MOCK_HISTORY = [
    {
        "date": "2020-01-15",
        "action": "registered",
        "factTypeCode": "SIDLO",
        "factTypeName": "Sidlo",
        "header": "Sidlo",
        "valueText": "",
    },
    {
        "date": "2020-06-01",
        "action": "registered",
        "factTypeCode": "PRAVNI_FORMA",
        "factTypeName": "Pravni forma",
        "header": "Pravni forma",
        "valueText": "",
    },
]

MOCK_PERSONS = [
    {
        "isNaturalPerson": True,
        "firstName": "Jan",
        "lastName": "Novak",
        "birthDate": "1985-03-15",
        "titleBefore": "Ing.",
        "titleAfter": "",
        "entityName": "",
        "entityIco": "",
        "functionName": "jednatel",
        "functionFrom": "2020-01-01",
        "functionTo": None,
        "membershipFrom": None,
        "membershipTo": None,
        "registrationDate": "2020-01-15",
        "deletionDate": None,
    }
]

MOCK_ADDRESSES = [
    {
        "addressType": "address",
        "country": "Ceska republika",
        "municipality": "Praha",
        "cityPart": "",
        "street": "Vodickova",
        "houseNumber": "123",
        "orientationNumber": "",
        "postalCode": "11000",
        "district": "",
        "fullAddress": "",
    }
]

MOCK_DATASETS = [
    {
        "datasetId": "sro-actual-praha-2024",
        "legalForm": "sro",
        "datasetType": "actual",
        "location": "praha",
        "year": 2024,
        "status": "completed",
        "lastSyncedAt": "2024-11-01T12:00:00+00:00",
        "entityCount": 150,
    }
]

MOCK_SYNC_STATUS = {
    "totalDatasets": 3,
    "completedDatasets": 2,
    "failedDatasets": 0,
    "pendingDatasets": 1,
    "lastSyncAt": "2024-11-01T12:00:00+00:00",
    "totalEntities": 5000,
}


# ---------------------------------------------------------------------------
# EntityLookupView  GET /api/v1/justice/entities/?ico={ico}
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_entity_lookup_success():
    """Valid ICO returns 200 with entity detail."""
    with patch("justice.views.JusticeService") as MockService:
        MockService.return_value.get_entity_by_ico.return_value = MOCK_ENTITY_DETAIL

        client = APIClient()
        resp = client.get("/api/v1/justice/entities/", {"ico": "12345678"})

        assert resp.status_code == 200
        assert resp.data["ico"] == "12345678"
        assert resp.data["name"] == "Test s.r.o."
        assert resp.data["isActive"] is True
        assert "facts" in resp.data
        MockService.return_value.get_entity_by_ico.assert_called_once_with("12345678")


@pytest.mark.django_db
def test_entity_lookup_missing_ico():
    """Missing ico query param returns 400."""
    client = APIClient()
    resp = client.get("/api/v1/justice/entities/")

    assert resp.status_code == 400


@pytest.mark.django_db
def test_entity_lookup_not_found():
    """Service raises 404 -> response is 404 with error body."""
    with patch("justice.views.JusticeService") as MockService:
        MockService.return_value.get_entity_by_ico.side_effect = ExternalAPIError(
            "Entity not found.", status_code=404, service_name="justice"
        )

        client = APIClient()
        resp = client.get("/api/v1/justice/entities/", {"ico": "00000000"})

        assert resp.status_code == 404
        assert resp.data["error"] == "Entity not found."


@pytest.mark.django_db
def test_entity_lookup_invalid_ico():
    """Service raises 400 for non-numeric ICO -> 400 response."""
    with patch("justice.views.JusticeService") as MockService:
        MockService.return_value.get_entity_by_ico.side_effect = ExternalAPIError(
            "ICO must be numeric.", status_code=400, service_name="justice"
        )

        client = APIClient()
        resp = client.get("/api/v1/justice/entities/", {"ico": "abc"})

        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# EntitySearchView  GET /api/v1/justice/entities/search/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_entity_search_success():
    """Search with name param returns 200 with paginated results."""
    with patch("justice.views.JusticeService") as MockService:
        MockService.return_value.search_entities.return_value = MOCK_SEARCH_RESULT

        client = APIClient()
        resp = client.get("/api/v1/justice/entities/search/", {"name": "Test"})

        assert resp.status_code == 200
        assert resp.data["totalCount"] == 1
        assert len(resp.data["entities"]) == 1
        assert resp.data["entities"][0]["ico"] == "12345678"


@pytest.mark.django_db
def test_entity_search_with_filters():
    """All search filters are passed through to the service."""
    with patch("justice.views.JusticeService") as MockService:
        MockService.return_value.search_entities.return_value = MOCK_SEARCH_RESULT

        client = APIClient()
        resp = client.get(
            "/api/v1/justice/entities/search/",
            {
                "name": "Test",
                "legalForm": "112",
                "location": "MSPH",
                "status": "active",
                "offset": "10",
                "limit": "5",
            },
        )

        assert resp.status_code == 200
        call_args = MockService.return_value.search_entities.call_args[0][0]
        assert call_args["name"] == "Test"
        assert call_args["legalForm"] == "112"
        assert call_args["location"] == "MSPH"
        assert call_args["status"] == "active"
        assert call_args["offset"] == 10
        assert call_args["limit"] == 5


@pytest.mark.django_db
def test_entity_search_empty_params():
    """Search with no params still works (defaults applied by serializer)."""
    with patch("justice.views.JusticeService") as MockService:
        MockService.return_value.search_entities.return_value = {
            "totalCount": 0,
            "offset": 0,
            "limit": 20,
            "entities": [],
        }

        client = APIClient()
        resp = client.get("/api/v1/justice/entities/search/")

        assert resp.status_code == 200
        assert resp.data["totalCount"] == 0


# ---------------------------------------------------------------------------
# EntityHistoryView  GET /api/v1/justice/entities/{ico}/history/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_entity_history_success():
    """Valid ICO returns 200 with list of history entries."""
    with patch("justice.views.JusticeService") as MockService:
        MockService.return_value.get_entity_history.return_value = MOCK_HISTORY

        client = APIClient()
        resp = client.get("/api/v1/justice/entities/12345678/history/")

        assert resp.status_code == 200
        assert len(resp.data) == 2
        assert resp.data[0]["factTypeCode"] == "SIDLO"
        assert resp.data[0]["action"] == "registered"
        MockService.return_value.get_entity_history.assert_called_once_with("12345678")


@pytest.mark.django_db
def test_entity_history_not_found():
    """Non-existent ICO in history -> 404."""
    with patch("justice.views.JusticeService") as MockService:
        MockService.return_value.get_entity_history.side_effect = ExternalAPIError(
            "Entity not found.", status_code=404, service_name="justice"
        )

        client = APIClient()
        resp = client.get("/api/v1/justice/entities/99999999/history/")

        assert resp.status_code == 404
        assert resp.data["error"] == "Entity not found."


# ---------------------------------------------------------------------------
# EntityPersonsView  GET /api/v1/justice/entities/{ico}/persons/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_entity_persons_success():
    """Valid ICO returns 200 with list of persons."""
    with patch("justice.views.JusticeService") as MockService:
        MockService.return_value.get_entity_persons.return_value = MOCK_PERSONS

        client = APIClient()
        resp = client.get("/api/v1/justice/entities/12345678/persons/")

        assert resp.status_code == 200
        assert len(resp.data) == 1
        assert resp.data[0]["firstName"] == "Jan"
        assert resp.data[0]["lastName"] == "Novak"
        assert resp.data[0]["isNaturalPerson"] is True
        assert resp.data[0]["functionName"] == "jednatel"
        MockService.return_value.get_entity_persons.assert_called_once_with("12345678")


@pytest.mark.django_db
def test_entity_persons_not_found():
    """Non-existent ICO in persons -> 404."""
    with patch("justice.views.JusticeService") as MockService:
        MockService.return_value.get_entity_persons.side_effect = ExternalAPIError(
            "Entity not found.", status_code=404, service_name="justice"
        )

        client = APIClient()
        resp = client.get("/api/v1/justice/entities/99999999/persons/")

        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# EntityAddressesView  GET /api/v1/justice/entities/{ico}/addresses/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_entity_addresses_success():
    """Valid ICO returns 200 with list of addresses."""
    with patch("justice.views.JusticeService") as MockService:
        MockService.return_value.get_entity_addresses.return_value = MOCK_ADDRESSES

        client = APIClient()
        resp = client.get("/api/v1/justice/entities/12345678/addresses/")

        assert resp.status_code == 200
        assert len(resp.data) == 1
        assert resp.data[0]["municipality"] == "Praha"
        assert resp.data[0]["addressType"] == "address"
        assert resp.data[0]["postalCode"] == "11000"
        MockService.return_value.get_entity_addresses.assert_called_once_with("12345678")


@pytest.mark.django_db
def test_entity_addresses_not_found():
    """Non-existent ICO in addresses -> 404."""
    with patch("justice.views.JusticeService") as MockService:
        MockService.return_value.get_entity_addresses.side_effect = ExternalAPIError(
            "Entity not found.", status_code=404, service_name="justice"
        )

        client = APIClient()
        resp = client.get("/api/v1/justice/entities/99999999/addresses/")

        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DatasetListView  GET /api/v1/justice/datasets/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_dataset_list_success():
    """Returns 200 with list of dataset info dicts."""
    with patch("justice.views.JusticeService") as MockService:
        MockService.return_value.list_datasets.return_value = MOCK_DATASETS

        client = APIClient()
        resp = client.get("/api/v1/justice/datasets/")

        assert resp.status_code == 200
        assert len(resp.data) == 1
        assert resp.data[0]["datasetId"] == "sro-actual-praha-2024"
        assert resp.data[0]["entityCount"] == 150
        assert resp.data[0]["status"] == "completed"


# ---------------------------------------------------------------------------
# SyncStatusView  GET /api/v1/justice/sync/status/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_sync_status_success():
    """Returns 200 with aggregated sync status."""
    with patch("justice.views.JusticeService") as MockService:
        MockService.return_value.get_sync_status.return_value = MOCK_SYNC_STATUS

        client = APIClient()
        resp = client.get("/api/v1/justice/sync/status/")

        assert resp.status_code == 200
        assert resp.data["totalDatasets"] == 3
        assert resp.data["completedDatasets"] == 2
        assert resp.data["failedDatasets"] == 0
        assert resp.data["pendingDatasets"] == 1
        assert resp.data["totalEntities"] == 5000
        assert resp.data["lastSyncAt"] == "2024-11-01T12:00:00+00:00"
