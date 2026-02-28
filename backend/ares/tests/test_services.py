import pytest
from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.utils import timezone

from company.models import Company
from core.exceptions import ExternalAPIError
from ares.models import EconomicSubject
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


@pytest.mark.django_db
class TestAresServicePersistence:
    def test_get_by_ico_persists_to_db(self):
        """After fetching from API, the record is persisted in EconomicSubject."""
        mock_client = MagicMock()
        mock_client.get_by_ico.return_value = MOCK_DETAIL_RESPONSE

        service = AresService(client=mock_client)
        service.get_by_ico("27082440")

        assert EconomicSubject.objects.filter(ico="27082440").exists()
        record = EconomicSubject.objects.get(ico="27082440")
        assert record.business_name == "Alza.cz a.s."
        assert record.raw_data == MOCK_DETAIL_RESPONSE

    def test_get_by_ico_creates_company(self):
        """Fetching from ARES also creates a Company hub record."""
        mock_client = MagicMock()
        mock_client.get_by_ico.return_value = MOCK_DETAIL_RESPONSE

        service = AresService(client=mock_client)
        service.get_by_ico("27082440")

        assert Company.objects.filter(ico="27082440").exists()
        record = EconomicSubject.objects.get(ico="27082440")
        assert record.company is not None
        assert record.company.ico == "27082440"

    def test_get_by_ico_reuses_existing_company(self):
        """If Company already exists (e.g. from Justice), ARES links to it."""
        existing = Company.objects.create(ico="27082440", name="From Justice")
        mock_client = MagicMock()
        mock_client.get_by_ico.return_value = MOCK_DETAIL_RESPONSE

        service = AresService(client=mock_client)
        service.get_by_ico("27082440")

        record = EconomicSubject.objects.get(ico="27082440")
        assert record.company_id == existing.id
        assert Company.objects.count() == 1


@pytest.mark.django_db
class TestAresThreeTierLookup:
    def test_db_hit_skips_api_call(self):
        """If EconomicSubject exists in DB with raw_data, no API call is made."""
        company = Company.objects.create(ico="27082440", name="Alza.cz a.s.")
        EconomicSubject.objects.create(
            ico="27082440",
            business_name="Alza.cz a.s.",
            raw_data=MOCK_DETAIL_RESPONSE,
            company=company,
        )

        mock_client = MagicMock()
        service = AresService(client=mock_client)
        result = service.get_by_ico("27082440")

        # API was NOT called — served from DB
        mock_client.get_by_ico.assert_not_called()
        assert result is not None

    def test_db_miss_calls_api(self):
        """If no DB record exists, API is called and result is persisted."""
        mock_client = MagicMock()
        mock_client.get_by_ico.return_value = MOCK_DETAIL_RESPONSE

        service = AresService(client=mock_client)
        result = service.get_by_ico("27082440")

        mock_client.get_by_ico.assert_called_once_with("27082440")
        assert EconomicSubject.objects.filter(ico="27082440").exists()

    def test_stale_db_record_triggers_background_refresh(self):
        """If DB record is older than FRESHNESS_TTL, background refresh is scheduled."""
        company = Company.objects.create(ico="27082440", name="Alza.cz a.s.")
        record = EconomicSubject.objects.create(
            ico="27082440",
            business_name="Alza.cz a.s.",
            raw_data=MOCK_DETAIL_RESPONSE,
            company=company,
        )
        # Make record stale (older than 24h)
        EconomicSubject.objects.filter(pk=record.pk).update(
            updated_at=timezone.now() - timedelta(hours=25)
        )

        mock_client = MagicMock()
        service = AresService(client=mock_client)

        with patch.object(service, "_schedule_background_refresh") as mock_refresh:
            result = service.get_by_ico("27082440")

        # Result served from DB (stale but instant)
        assert result is not None
        # Background refresh was triggered
        mock_refresh.assert_called_once_with("27082440")

    def test_fresh_db_record_no_background_refresh(self):
        """If DB record is fresh (< FRESHNESS_TTL), no background refresh."""
        company = Company.objects.create(ico="27082440", name="Alza.cz a.s.")
        EconomicSubject.objects.create(
            ico="27082440",
            business_name="Alza.cz a.s.",
            raw_data=MOCK_DETAIL_RESPONSE,
            company=company,
        )
        # Record just created = fresh (updated_at is now)

        mock_client = MagicMock()
        service = AresService(client=mock_client)

        with patch.object(service, "_schedule_background_refresh") as mock_refresh:
            result = service.get_by_ico("27082440")

        mock_refresh.assert_not_called()


MOCK_DETAIL_WITH_STATS = {
    "ico": "27082440",
    "icoId": "27082440",
    "obchodniJmeno": "Alza.cz a.s.",
    "sidlo": {
        "kodKraje": 19,
        "nazevKraje": "Hlavní město Praha",
    },
    "czNace": ["47910"],
    "statistickeUdaje": {
        "kategoriePoctuPracovniku": "500-999",
    },
    "pravniForma": "121",
}


@pytest.mark.django_db
class TestAresSearchFieldPopulation:
    def test_persist_populates_search_fields_on_company(self):
        """ARES fetch extracts region, employees, NACE, legal form onto Company."""
        mock_client = MagicMock()
        mock_client.get_by_ico.return_value = MOCK_DETAIL_WITH_STATS

        service = AresService(client=mock_client)
        service.get_by_ico("27082440")

        company = Company.objects.get(ico="27082440")
        assert company.legal_form == "121"
        assert company.region_code == 19
        assert company.region_name == "Hlavní město Praha"
        assert company.employee_category == "500-999"
        assert company.nace_primary == "47910"

    def test_persist_updates_search_fields_on_refetch(self):
        """Second ARES fetch updates search fields (not just get_or_create)."""
        Company.objects.create(
            ico="27082440", name="Old Name", legal_form="112",
        )

        mock_client = MagicMock()
        mock_client.get_by_ico.return_value = MOCK_DETAIL_WITH_STATS

        service = AresService(client=mock_client)
        service.get_by_ico("27082440")

        company = Company.objects.get(ico="27082440")
        # Should be updated to ARES values
        assert company.legal_form == "121"
        assert company.region_code == 19


@pytest.mark.django_db
class TestAresSearchPersistence:
    def test_search_persists_results_to_db(self):
        """Each entity from search results is persisted as Company + EconomicSubject."""
        mock_client = MagicMock()
        mock_client.search.return_value = MOCK_SEARCH_RESPONSE

        service = AresService(client=mock_client)
        service.search({"businessName": "Alza"})

        assert Company.objects.count() >= 1
        assert EconomicSubject.objects.count() >= 1

    def test_search_does_not_overwrite_existing_company_name(self):
        """Search uses get_or_create for Company — doesn't overwrite detail-level data."""
        Company.objects.create(ico="27082440", name="Full Detail Name")

        mock_client = MagicMock()
        mock_client.search.return_value = MOCK_SEARCH_RESPONSE

        service = AresService(client=mock_client)
        service.search({"businessName": "Alza"})

        company = Company.objects.get(ico="27082440")
        assert company.name == "Full Detail Name"  # NOT overwritten by search summary
