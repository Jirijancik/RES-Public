import pytest
from unittest.mock import MagicMock, patch

from core.exceptions import ExternalAPIError
from ares.services import AresService


MOCK_SEARCH_RESPONSE = {
    "pocetCelkem": 1,
    "ekonomickeSubjekty": [
        {
            "ico": "27082440",
            "icoId": "27082440",
            "obchodniJmeno": "Alza.cz a.s.",
        }
    ],
}

MOCK_DETAIL_RESPONSE = {
    "ico": "27082440",
    "icoId": "27082440",
    "obchodniJmeno": "Alza.cz a.s.",
}


@pytest.mark.django_db
class TestAresServiceSearch:
    def test_search_calls_client_on_cache_miss(self):
        mock_client = MagicMock()
        mock_client.search.return_value = MOCK_SEARCH_RESPONSE

        service = AresService(client=mock_client)
        result = service.search({"businessName": "Alza"})

        assert mock_client.search.call_count == 1
        assert result["totalCount"] == 1
        assert result["economicSubjects"][0]["icoId"] == "27082440"

    def test_search_returns_cached_result(self):
        mock_client = MagicMock()
        mock_client.search.return_value = MOCK_SEARCH_RESPONSE

        service = AresService(client=mock_client)

        # First call: cache miss
        service.search({"businessName": "Alza"})
        assert mock_client.search.call_count == 1

        # Second call: cache hit
        service.search({"businessName": "Alza"})
        assert mock_client.search.call_count == 1

    def test_search_caches_individual_subjects(self):
        mock_client = MagicMock()
        mock_client.search.return_value = MOCK_SEARCH_RESPONSE
        mock_client.get_by_ico.return_value = MOCK_DETAIL_RESPONSE

        service = AresService(client=mock_client)
        service.search({"businessName": "Alza"})

        # Detail should be cached from search results
        result = service.get_by_ico("27082440")
        assert mock_client.get_by_ico.call_count == 0
        assert result["icoId"] == "27082440"


@pytest.mark.django_db
class TestAresServiceGetByIco:
    def test_get_by_ico_normalizes_and_returns(self):
        mock_client = MagicMock()
        mock_client.get_by_ico.return_value = MOCK_DETAIL_RESPONSE

        service = AresService(client=mock_client)
        result = service.get_by_ico("27082440")

        assert result["icoId"] == "27082440"
        mock_client.get_by_ico.assert_called_once_with("27082440")

    def test_get_by_ico_pads_short_ico(self):
        mock_client = MagicMock()
        mock_client.get_by_ico.return_value = {
            "ico": "00000123",
            "icoId": "00000123",
            "obchodniJmeno": "Test",
        }

        service = AresService(client=mock_client)
        service.get_by_ico("123")

        mock_client.get_by_ico.assert_called_once_with("00000123")

    def test_get_by_ico_invalid_format(self):
        service = AresService(client=MagicMock())

        with pytest.raises(ExternalAPIError) as exc_info:
            service.get_by_ico("not-a-number")

        assert exc_info.value.status_code == 400

    def test_get_by_ico_returns_cached(self):
        mock_client = MagicMock()
        mock_client.get_by_ico.return_value = MOCK_DETAIL_RESPONSE

        service = AresService(client=mock_client)

        service.get_by_ico("27082440")
        assert mock_client.get_by_ico.call_count == 1

        service.get_by_ico("27082440")
        assert mock_client.get_by_ico.call_count == 1


@pytest.mark.django_db
class TestAresServiceThrottling:
    def test_search_blocked_by_throttle(self):
        mock_client = MagicMock()
        service = AresService(client=mock_client)

        # Exhaust the throttle
        with patch.object(service.outbound_throttle, "allow", return_value=False):
            with pytest.raises(ExternalAPIError) as exc_info:
                service.search({"businessName": "Test"})

            assert exc_info.value.status_code == 429

    def test_get_by_ico_blocked_by_throttle(self):
        mock_client = MagicMock()
        service = AresService(client=mock_client)

        with patch.object(service.outbound_throttle, "allow", return_value=False):
            with pytest.raises(ExternalAPIError) as exc_info:
                service.get_by_ico("27082440")

            assert exc_info.value.status_code == 429
