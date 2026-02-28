"""
Tests for JusticeService and JusticeSyncService business logic.

Uses pytest + pytest-django. All DB tests decorated with @pytest.mark.django_db.
Models created directly via Model.objects.create() — no factories.
"""
import pytest
from datetime import date
from unittest.mock import patch, MagicMock

from company.models import Company
from justice.services import JusticeService, JusticeSyncService
from justice.models import Address, DatasetSync, Entity, EntityFact, Person
from core.exceptions import ExternalAPIError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _create_entity(**overrides) -> Entity:
    """Shortcut to create an Entity with sensible defaults."""
    defaults = {
        "ico": "12345678",
        "name": "Test s.r.o.",
        "legal_form_code": "112",
        "legal_form_name": "s.r.o.",
        "court_code": "MSPH",
        "court_name": "Mestsky soud v Praze",
        "file_section": "C",
        "file_number": 231666,
        "file_reference": "C 231666/MSPH",
        "dataset_id": "sro-actual-praha-2024",
        "is_active": True,
    }
    defaults.update(overrides)
    return Entity.objects.create(**defaults)


def _create_fact(entity, **overrides) -> EntityFact:
    """Shortcut to create an EntityFact with sensible defaults."""
    defaults = {
        "entity": entity,
        "header": "Sidlo",
        "fact_type_code": "SIDLO",
        "fact_type_name": "Sidlo",
        "value_text": "",
        "registration_date": date(2020, 1, 15),
    }
    defaults.update(overrides)
    return EntityFact.objects.create(**defaults)


# ---------------------------------------------------------------------------
# JusticeService — get_entity_by_ico
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_get_entity_by_ico_found():
    """Entity exists in DB -> returns camelCase detail dict."""
    entity = _create_entity(
        ico="12345678",
        name="Test s.r.o.",
        registration_date=date(2020, 1, 15),
    )
    _create_fact(entity)

    service = JusticeService()
    result = service.get_entity_by_ico("12345678")

    assert result["ico"] == "12345678"
    assert result["name"] == "Test s.r.o."
    assert result["isActive"] is True
    assert result["legalFormCode"] == "112"
    assert result["courtCode"] == "MSPH"
    assert result["fileReference"] == "C 231666/MSPH"
    assert result["registrationDate"] == "2020-01-15"
    assert "facts" in result


@pytest.mark.django_db
def test_get_entity_by_ico_not_found():
    """No matching entity -> ExternalAPIError with status_code 404."""
    service = JusticeService()
    with pytest.raises(ExternalAPIError) as exc_info:
        service.get_entity_by_ico("00000000")
    assert exc_info.value.status_code == 404


@pytest.mark.django_db
def test_get_entity_by_ico_cached():
    """Second call returns cached result without extra DB query."""
    entity = _create_entity(ico="11111111", dataset_id="sro-actual-praha-2024")
    _create_fact(entity)

    service = JusticeService()

    # First call populates cache.
    result1 = service.get_entity_by_ico("11111111")

    # Delete entity from DB to prove second call comes from cache.
    Entity.objects.filter(ico="11111111").delete()

    result2 = service.get_entity_by_ico("11111111")
    assert result1 == result2
    assert result2["ico"] == "11111111"


@pytest.mark.django_db
def test_get_entity_by_ico_zero_padded():
    """ICO shorter than 8 digits is zero-padded to match DB."""
    _create_entity(ico="00123456", dataset_id="sro-actual-praha-2024")

    service = JusticeService()
    result = service.get_entity_by_ico("123456")
    assert result["ico"] == "00123456"


# ---------------------------------------------------------------------------
# JusticeService — search_entities
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_search_entities_by_name():
    """Filter by name (icontains) returns matching entities."""
    _create_entity(ico="11111111", name="Alpha Corp", dataset_id="sro-actual-praha-2024")
    _create_entity(ico="22222222", name="Beta Corp", dataset_id="sro-actual-brno-2024")
    _create_entity(ico="33333333", name="Gamma Inc", dataset_id="sro-actual-ostrava-2024")

    service = JusticeService()
    result = service.search_entities({"name": "Corp", "status": "all"})

    assert result["totalCount"] == 2
    names = [e["name"] for e in result["entities"]]
    assert "Alpha Corp" in names
    assert "Beta Corp" in names


@pytest.mark.django_db
def test_search_entities_pagination():
    """Offset and limit control which slice of results is returned."""
    for i in range(5):
        _create_entity(
            ico=f"1000000{i}",
            name=f"Company {i:02d}",
            dataset_id=f"sro-actual-praha-{2020 + i}",
        )

    service = JusticeService()
    result = service.search_entities({"status": "all", "offset": 1, "limit": 2})

    assert result["totalCount"] == 5
    assert result["offset"] == 1
    assert result["limit"] == 2
    assert len(result["entities"]) == 2


@pytest.mark.django_db
def test_search_entities_active_filter():
    """status=active excludes inactive entities; status=deleted shows only deleted."""
    _create_entity(ico="11111111", name="Active Co", is_active=True, dataset_id="sro-actual-praha-2024")
    _create_entity(ico="22222222", name="Deleted Co", is_active=False, dataset_id="sro-actual-brno-2024")

    service = JusticeService()

    active_result = service.search_entities({"status": "active"})
    assert active_result["totalCount"] == 1
    assert active_result["entities"][0]["name"] == "Active Co"

    deleted_result = service.search_entities({"status": "deleted"})
    assert deleted_result["totalCount"] == 1
    assert deleted_result["entities"][0]["name"] == "Deleted Co"

    all_result = service.search_entities({"status": "all"})
    assert all_result["totalCount"] == 2


@pytest.mark.django_db
def test_search_entities_by_legal_form():
    """Filter by legalForm matches legal_form_code exactly."""
    _create_entity(ico="11111111", legal_form_code="112", dataset_id="sro-actual-praha-2024")
    _create_entity(ico="22222222", legal_form_code="121", dataset_id="as-actual-praha-2024")

    service = JusticeService()
    result = service.search_entities({"legalForm": "112", "status": "all"})

    assert result["totalCount"] == 1
    assert result["entities"][0]["legalFormCode"] == "112"


@pytest.mark.django_db
def test_search_entities_by_location():
    """Filter by location matches court_code."""
    _create_entity(ico="11111111", court_code="MSPH", dataset_id="sro-actual-praha-2024")
    _create_entity(ico="22222222", court_code="KSBR", dataset_id="sro-actual-brno-2024")

    service = JusticeService()
    result = service.search_entities({"location": "MSPH", "status": "all"})

    assert result["totalCount"] == 1
    assert result["entities"][0]["ico"] == "11111111"


# ---------------------------------------------------------------------------
# JusticeService — get_entity_history
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_get_entity_history():
    """Returns chronologically ordered facts as history entries."""
    entity = _create_entity(ico="12345678")
    _create_fact(
        entity,
        header="Sidlo",
        fact_type_code="SIDLO",
        fact_type_name="Sidlo",
        registration_date=date(2020, 1, 15),
    )
    _create_fact(
        entity,
        header="Pravni forma",
        fact_type_code="PRAVNI_FORMA",
        fact_type_name="Pravni forma",
        registration_date=date(2020, 6, 1),
    )

    service = JusticeService()
    result = service.get_entity_history("12345678")

    assert len(result) == 2
    assert result[0]["date"] == "2020-01-15"
    assert result[0]["factTypeCode"] == "SIDLO"
    assert result[0]["action"] == "registered"
    assert result[1]["date"] == "2020-06-01"
    assert result[1]["factTypeCode"] == "PRAVNI_FORMA"


@pytest.mark.django_db
def test_get_entity_history_not_found():
    """History for non-existent ICO raises 404."""
    service = JusticeService()
    with pytest.raises(ExternalAPIError) as exc_info:
        service.get_entity_history("99999999")
    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# JusticeService — get_entity_persons
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_get_entity_persons():
    """Returns persons with associated fact details."""
    entity = _create_entity(ico="12345678")
    fact = _create_fact(
        entity,
        header="Jednatel",
        fact_type_code="STATUTARNI_ORGAN_CLEN",
        function_name="jednatel",
        function_from=date(2020, 1, 1),
        registration_date=date(2020, 1, 15),
    )
    Person.objects.create(
        fact=fact,
        first_name="Jan",
        last_name="Novak",
        birth_date=date(1985, 3, 15),
        is_natural_person=True,
    )

    service = JusticeService()
    result = service.get_entity_persons("12345678")

    assert len(result) == 1
    person = result[0]
    assert person["firstName"] == "Jan"
    assert person["lastName"] == "Novak"
    assert person["isNaturalPerson"] is True
    assert person["functionName"] == "jednatel"
    assert person["birthDate"] == "1985-03-15"


@pytest.mark.django_db
def test_get_entity_persons_not_found():
    """Persons for non-existent ICO raises 404."""
    service = JusticeService()
    with pytest.raises(ExternalAPIError) as exc_info:
        service.get_entity_persons("99999999")
    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# JusticeService — get_entity_addresses
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_get_entity_addresses():
    """Returns addresses linked to an entity's facts."""
    entity = _create_entity(ico="12345678")
    fact = _create_fact(entity, header="Sidlo", fact_type_code="SIDLO")
    Address.objects.create(
        fact=fact,
        address_type="address",
        country="Ceska republika",
        municipality="Praha",
        street="Vodickova",
        postal_code="11000",
    )

    service = JusticeService()
    result = service.get_entity_addresses("12345678")

    assert len(result) == 1
    addr = result[0]
    assert addr["addressType"] == "address"
    assert addr["municipality"] == "Praha"
    assert addr["street"] == "Vodickova"
    assert addr["postalCode"] == "11000"


@pytest.mark.django_db
def test_get_entity_addresses_not_found():
    """Addresses for non-existent ICO raises 404."""
    service = JusticeService()
    with pytest.raises(ExternalAPIError) as exc_info:
        service.get_entity_addresses("99999999")
    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# JusticeService — list_datasets / get_sync_status
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_list_datasets():
    """Returns dataset info from DatasetSync table."""
    DatasetSync.objects.create(
        dataset_id="sro-actual-praha-2024",
        legal_form="sro",
        dataset_type="actual",
        location="praha",
        year=2024,
        status="completed",
        entity_count=150,
    )
    DatasetSync.objects.create(
        dataset_id="as-actual-brno-2025",
        legal_form="as",
        dataset_type="actual",
        location="brno",
        year=2025,
        status="pending",
        entity_count=0,
    )

    service = JusticeService()
    result = service.list_datasets()

    assert len(result) == 2
    # Ordered by dataset_id.
    assert result[0]["datasetId"] == "as-actual-brno-2025"
    assert result[1]["datasetId"] == "sro-actual-praha-2024"
    assert result[1]["entityCount"] == 150
    assert result[1]["status"] == "completed"


@pytest.mark.django_db
def test_get_sync_status():
    """Returns aggregated sync status across all datasets."""
    DatasetSync.objects.create(
        dataset_id="sro-actual-praha-2024",
        legal_form="sro",
        dataset_type="actual",
        location="praha",
        year=2024,
        status="completed",
        entity_count=100,
    )
    DatasetSync.objects.create(
        dataset_id="as-actual-brno-2024",
        legal_form="as",
        dataset_type="actual",
        location="brno",
        year=2024,
        status="failed",
        entity_count=0,
    )
    DatasetSync.objects.create(
        dataset_id="sro-actual-ostrava-2024",
        legal_form="sro",
        dataset_type="actual",
        location="ostrava",
        year=2024,
        status="pending",
        entity_count=0,
    )

    service = JusticeService()
    result = service.get_sync_status()

    assert result["totalDatasets"] == 3
    assert result["completedDatasets"] == 1
    assert result["failedDatasets"] == 1
    assert result["pendingDatasets"] == 1
    assert result["totalEntities"] == 100


# ---------------------------------------------------------------------------
# JusticeSyncService — _parse_dataset_id
# ---------------------------------------------------------------------------


def test_parse_dataset_id():
    """Standard 4-part dataset ID is parsed correctly."""
    result = JusticeSyncService._parse_dataset_id("sro-actual-praha-2024")

    assert result["legal_form"] == "sro"
    assert result["dataset_type"] == "actual"
    assert result["location"] == "praha"
    assert result["year"] == 2024


def test_parse_dataset_id_complex():
    """Multi-word legal form with underscores parses correctly."""
    result = JusticeSyncService._parse_dataset_id("nadacni_fond-actual-brno-2025")

    assert result["legal_form"] == "nadacni_fond"
    assert result["dataset_type"] == "actual"
    assert result["location"] == "brno"
    assert result["year"] == 2025


def test_parse_dataset_id_with_hyphens_in_legal_form():
    """Legal form containing hyphens is reassembled correctly."""
    result = JusticeSyncService._parse_dataset_id(
        "spolecenstvi-vlastniku-actual-praha-2024"
    )

    assert result["legal_form"] == "spolecenstvi-vlastniku"
    assert result["dataset_type"] == "actual"
    assert result["location"] == "praha"
    assert result["year"] == 2024


def test_parse_dataset_id_three_parts():
    """Fallback for 3-part ID: legal_form-location-year."""
    result = JusticeSyncService._parse_dataset_id("sro-praha-2024")

    assert result["legal_form"] == "sro"
    assert result["dataset_type"] == "actual"
    assert result["location"] == "praha"
    assert result["year"] == 2024


# ---------------------------------------------------------------------------
# JusticeSyncService — sync_dataset (skip logic)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_sync_dataset_skipped():
    """Already completed dataset with same file_size is skipped."""
    DatasetSync.objects.create(
        dataset_id="sro-actual-praha-2024",
        legal_form="sro",
        dataset_type="actual",
        location="praha",
        year=2024,
        status="completed",
        entity_count=100,
        file_size=5000,
    )

    mock_client = MagicMock()
    mock_client.get_dataset.return_value = {
        "resources": [{"url": "https://example.com/data.xml.gz", "format": "XML_GZ"}],
    }
    mock_client.get_file_size.return_value = 5000

    sync_service = JusticeSyncService(client=mock_client)
    result = sync_service.sync_dataset("sro-actual-praha-2024")

    assert result["status"] == "skipped"
    assert result["entityCount"] == 100
    assert result["durationSeconds"] == 0
    # Verify no download occurred.
    mock_client.download_file_stream.assert_not_called()


@pytest.mark.django_db
class TestJusticeSyncCreatesCompany:
    def test_upsert_entity_creates_company(self):
        """_upsert_entity creates a Company hub record and links the Entity."""
        sync_service = JusticeSyncService(client=MagicMock())

        subjekt = {
            "ico": "12345678",
            "name": "Test s.r.o.",
            "registration_date": "2020-01-15",
            "deletion_date": None,
            "facts": [],
        }
        entity = sync_service._upsert_entity(subjekt, "sro-actual-praha-2024")

        assert entity is not None
        assert entity.company is not None
        assert entity.company.ico == "12345678"
        assert entity.company.name == "Test s.r.o."
        assert Company.objects.count() == 1

    def test_upsert_entity_reuses_existing_company(self):
        """If Company already exists for this ICO, it's reused (not duplicated)."""
        company = Company.objects.create(ico="12345678", name="Old Name")
        sync_service = JusticeSyncService(client=MagicMock())

        subjekt = {
            "ico": "12345678",
            "name": "New Name",
            "facts": [],
        }
        entity = sync_service._upsert_entity(subjekt, "sro-actual-praha-2024")

        assert entity.company_id == company.id
        assert Company.objects.count() == 1


@pytest.mark.django_db
class TestJusticeSyncPopulatesSearchFields:
    def test_upsert_entity_sets_legal_form_on_company(self):
        """Justice sync writes legal_form to Company if not already set."""
        sync_service = JusticeSyncService(client=MagicMock())

        subjekt = {
            "ico": "12345678",
            "name": "Test s.r.o.",
            "facts": [
                {
                    "header": "Právní forma",
                    "fact_type": {"code": "PRAVNI_FORMA", "name": "Právní forma"},
                    "value_text": "Společnost s ručením omezeným",
                    "legal_form": {"code": "112", "name": "Společnost s ručením omezeným"},
                    "sub_facts": [],
                }
            ],
        }
        sync_service._upsert_entity(subjekt, "sro-actual-praha-2024")

        company = Company.objects.get(ico="12345678")
        assert company.legal_form == "112"

    def test_upsert_entity_does_not_overwrite_ares_legal_form(self):
        """If Company already has legal_form from ARES, Justice doesn't overwrite."""
        Company.objects.create(ico="12345678", name="Test", legal_form="112")

        sync_service = JusticeSyncService(client=MagicMock())
        subjekt = {
            "ico": "12345678",
            "name": "Test s.r.o.",
            "facts": [],
        }
        sync_service._upsert_entity(subjekt, "sro-actual-praha-2024")

        company = Company.objects.get(ico="12345678")
        assert company.legal_form == "112"  # Unchanged
