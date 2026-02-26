"""
Tests for justice.parser — pure transformation functions.

Every function under test takes a Django model instance (or a plain dict)
and returns a camelCase dict.  We use MagicMock to stand in for real
model instances so no database is needed.
"""

import pytest
from unittest.mock import MagicMock, PropertyMock
from datetime import date, datetime

from justice.parser import (
    parse_entity_detail,
    parse_entity_summary,
    parse_history_entry,
    parse_person_with_fact,
    parse_address,
    parse_dataset_info,
    parse_sync_status,
)


# ---------------------------------------------------------------------------
# Mock factories
# ---------------------------------------------------------------------------


def _mock_entity(**overrides):
    """Return a MagicMock that looks like an Entity model instance."""
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
        "registration_date": date(2020, 1, 15),
        "deletion_date": None,
        "is_active": True,
    }
    defaults.update(overrides)
    entity = MagicMock()
    for attr, value in defaults.items():
        setattr(entity, attr, value)
    return entity


def _mock_person(**overrides):
    """Return a MagicMock that looks like a Person model instance."""
    defaults = {
        "is_natural_person": True,
        "first_name": "Jan",
        "last_name": "Novak",
        "birth_date": date(1985, 6, 20),
        "title_before": "Ing.",
        "title_after": "Ph.D.",
        "entity_name": None,
        "entity_ico": None,
    }
    defaults.update(overrides)
    person = MagicMock()
    for attr, value in defaults.items():
        setattr(person, attr, value)
    return person


def _mock_address(**overrides):
    """Return a MagicMock that looks like an Address model instance."""
    defaults = {
        "address_type": "SIDLO",
        "country": "CZ",
        "municipality": "Praha",
        "city_part": "Praha 1",
        "street": "Vodickova",
        "house_number": "123",
        "orientation_number": "4a",
        "postal_code": "11000",
        "district": "Praha",
        "full_address": "Vodickova 123/4a, Praha 1, 11000 Praha",
    }
    defaults.update(overrides)
    addr = MagicMock()
    for attr, value in defaults.items():
        setattr(addr, attr, value)
    return addr


def _mock_fact(**overrides):
    """Return a MagicMock that looks like an EntityFact model instance."""
    defaults = {
        "header": "Statutory body",
        "fact_type_code": "STATUTARNI_ORGAN",
        "fact_type_name": "Statutarni organ",
        "value_text": "jednatel",
        "value_data": None,
        "registration_date": date(2020, 1, 15),
        "deletion_date": None,
        "function_name": "jednatel",
        "function_from": date(2020, 1, 15),
        "function_to": None,
        "membership_from": date(2020, 1, 15),
        "membership_to": None,
        "parent_fact_id": None,
    }
    defaults.update(overrides)
    fact = MagicMock()
    for attr, value in defaults.items():
        setattr(fact, attr, value)
    return fact


def _mock_dataset_sync(**overrides):
    """Return a MagicMock that looks like a DatasetSync model instance."""
    defaults = {
        "dataset_id": "or-full-2024",
        "legal_form": "s.r.o.",
        "dataset_type": "full",
        "location": "Praha",
        "year": 2024,
        "status": "completed",
        "last_synced_at": datetime(2024, 12, 1, 10, 30, 0),
        "entity_count": 5000,
    }
    defaults.update(overrides)
    ds = MagicMock()
    for attr, value in defaults.items():
        setattr(ds, attr, value)
    return ds


# ---------------------------------------------------------------------------
# parse_entity_summary
# ---------------------------------------------------------------------------


class TestParseEntitySummary:
    def test_all_fields(self):
        entity = _mock_entity()
        result = parse_entity_summary(entity)

        assert result == {
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

    def test_null_dates(self):
        entity = _mock_entity(registration_date=None, deletion_date=None)
        result = parse_entity_summary(entity)

        assert result["registrationDate"] is None
        assert result["deletionDate"] is None

    def test_deleted_entity(self):
        entity = _mock_entity(
            deletion_date=date(2023, 6, 30),
            is_active=False,
        )
        result = parse_entity_summary(entity)

        assert result["deletionDate"] == "2023-06-30"
        assert result["isActive"] is False


# ---------------------------------------------------------------------------
# parse_entity_detail
# ---------------------------------------------------------------------------


class TestParseEntityDetail:
    def test_with_facts(self):
        """Entity detail includes nested facts with person and addresses."""
        entity = _mock_entity()

        # Build a fact that has a person, addresses, and no sub-facts.
        person = _mock_person()
        addr = _mock_address()
        fact = _mock_fact()
        fact.person = person
        fact.addresses.all.return_value = [addr]
        fact.sub_facts.all.return_value = []

        result = parse_entity_detail(entity, [fact])

        assert result["ico"] == "12345678"
        assert result["name"] == "Test s.r.o."
        assert result["registrationDate"] == "2020-01-15"
        assert len(result["facts"]) == 1

        parsed_fact = result["facts"][0]
        assert parsed_fact["header"] == "Statutory body"
        assert parsed_fact["factTypeCode"] == "STATUTARNI_ORGAN"
        assert parsed_fact["person"]["firstName"] == "Jan"
        assert parsed_fact["person"]["lastName"] == "Novak"
        assert len(parsed_fact["addresses"]) == 1
        assert parsed_fact["addresses"][0]["municipality"] == "Praha"

    def test_empty_facts(self):
        entity = _mock_entity()
        result = parse_entity_detail(entity, [])

        assert result["facts"] == []

    def test_skips_child_facts_at_top_level(self):
        """Facts with a non-None parent_fact_id are filtered out at top level."""
        entity = _mock_entity()

        parent_fact = _mock_fact(parent_fact_id=None)
        parent_fact.person = _mock_person()
        parent_fact.addresses.all.return_value = []
        parent_fact.sub_facts.all.return_value = []

        child_fact = _mock_fact(parent_fact_id=42)
        child_fact.person = _mock_person()
        child_fact.addresses.all.return_value = []
        child_fact.sub_facts.all.return_value = []

        result = parse_entity_detail(entity, [parent_fact, child_fact])

        # Only the parent should appear at the top level.
        assert len(result["facts"]) == 1

    def test_fact_without_person(self):
        """A fact whose .person access raises an exception -> person=None."""
        entity = _mock_entity()

        fact = _mock_fact()
        type(fact).person = PropertyMock(side_effect=Exception("no person"))
        fact.addresses.all.return_value = []
        fact.sub_facts.all.return_value = []

        result = parse_entity_detail(entity, [fact])

        assert result["facts"][0]["person"] is None

    def test_fact_with_sub_facts(self):
        """Sub-facts are nested inside their parent fact."""
        entity = _mock_entity()

        sub_fact = _mock_fact(
            header="Sub header",
            fact_type_code="SUB_TYPE",
            parent_fact_id=1,
        )
        sub_fact.person = _mock_person(first_name="Eva", last_name="Kralova")
        sub_fact.addresses.all.return_value = []
        sub_fact.sub_facts.all.return_value = []

        parent_fact = _mock_fact(parent_fact_id=None)
        parent_fact.person = _mock_person()
        parent_fact.addresses.all.return_value = []
        parent_fact.sub_facts.all.return_value = [sub_fact]

        result = parse_entity_detail(entity, [parent_fact])

        assert len(result["facts"]) == 1
        parent = result["facts"][0]
        assert len(parent["subFacts"]) == 1
        assert parent["subFacts"][0]["header"] == "Sub header"
        assert parent["subFacts"][0]["person"]["firstName"] == "Eva"


# ---------------------------------------------------------------------------
# parse_history_entry
# ---------------------------------------------------------------------------


class TestParseHistoryEntry:
    def test_registered(self):
        fact = _mock_fact(
            registration_date=date(2021, 3, 10),
            deletion_date=None,
        )
        result = parse_history_entry(fact)

        assert result == {
            "date": "2021-03-10",
            "action": "registered",
            "factTypeCode": "STATUTARNI_ORGAN",
            "factTypeName": "Statutarni organ",
            "header": "Statutory body",
            "valueText": "jednatel",
        }

    def test_deleted(self):
        fact = _mock_fact(
            registration_date=date(2021, 3, 10),
            deletion_date=date(2023, 12, 31),
        )
        result = parse_history_entry(fact)

        assert result["action"] == "deleted"
        # date prefers registration_date when both present
        assert result["date"] == "2021-03-10"

    def test_deleted_no_registration_date(self):
        fact = _mock_fact(
            registration_date=None,
            deletion_date=date(2023, 12, 31),
        )
        result = parse_history_entry(fact)

        assert result["action"] == "deleted"
        assert result["date"] == "2023-12-31"

    def test_no_dates_at_all(self):
        fact = _mock_fact(registration_date=None, deletion_date=None)
        result = parse_history_entry(fact)

        assert result["action"] == "registered"
        assert result["date"] == ""


# ---------------------------------------------------------------------------
# parse_person_with_fact
# ---------------------------------------------------------------------------


class TestParsePersonWithFact:
    def test_natural_person(self):
        person = _mock_person(
            is_natural_person=True,
            first_name="Jan",
            last_name="Novak",
            birth_date=date(1985, 6, 20),
            title_before="Ing.",
            title_after="Ph.D.",
            entity_name=None,
            entity_ico=None,
        )
        fact = _mock_fact(
            function_name="jednatel",
            function_from=date(2020, 1, 15),
            function_to=None,
            membership_from=date(2020, 1, 15),
            membership_to=None,
            registration_date=date(2020, 1, 15),
            deletion_date=None,
        )
        fact.person = person

        result = parse_person_with_fact(fact)

        assert result == {
            "isNaturalPerson": True,
            "firstName": "Jan",
            "lastName": "Novak",
            "birthDate": "1985-06-20",
            "titleBefore": "Ing.",
            "titleAfter": "Ph.D.",
            "entityName": None,
            "entityIco": None,
            "functionName": "jednatel",
            "functionFrom": "2020-01-15",
            "functionTo": None,
            "membershipFrom": "2020-01-15",
            "membershipTo": None,
            "registrationDate": "2020-01-15",
            "deletionDate": None,
        }

    def test_legal_person(self):
        person = _mock_person(
            is_natural_person=False,
            first_name=None,
            last_name=None,
            birth_date=None,
            title_before=None,
            title_after=None,
            entity_name="Holding a.s.",
            entity_ico="99887766",
        )
        fact = _mock_fact(
            function_name="clen predstavenstva",
            function_from=date(2019, 5, 1),
            function_to=date(2022, 5, 1),
            membership_from=date(2019, 5, 1),
            membership_to=date(2022, 5, 1),
            registration_date=date(2019, 5, 1),
            deletion_date=date(2022, 5, 1),
        )
        fact.person = person

        result = parse_person_with_fact(fact)

        assert result["isNaturalPerson"] is False
        assert result["firstName"] is None
        assert result["lastName"] is None
        assert result["birthDate"] is None
        assert result["entityName"] == "Holding a.s."
        assert result["entityIco"] == "99887766"
        assert result["functionTo"] == "2022-05-01"
        assert result["deletionDate"] == "2022-05-01"


# ---------------------------------------------------------------------------
# parse_address
# ---------------------------------------------------------------------------


class TestParseAddress:
    def test_full_address(self):
        addr = _mock_address()
        result = parse_address(addr)

        assert result == {
            "addressType": "SIDLO",
            "country": "CZ",
            "municipality": "Praha",
            "cityPart": "Praha 1",
            "street": "Vodickova",
            "houseNumber": "123",
            "orientationNumber": "4a",
            "postalCode": "11000",
            "district": "Praha",
            "fullAddress": "Vodickova 123/4a, Praha 1, 11000 Praha",
        }

    def test_minimal_address(self):
        addr = _mock_address(
            address_type=None,
            country=None,
            city_part=None,
            street=None,
            house_number=None,
            orientation_number=None,
            district=None,
            full_address=None,
            municipality="Brno",
            postal_code="60200",
        )
        result = parse_address(addr)

        assert result["municipality"] == "Brno"
        assert result["postalCode"] == "60200"
        assert result["street"] is None
        assert result["houseNumber"] is None
        assert result["fullAddress"] is None


# ---------------------------------------------------------------------------
# parse_dataset_info
# ---------------------------------------------------------------------------


class TestParseDatasetInfo:
    def test_all_fields(self):
        ds = _mock_dataset_sync()
        result = parse_dataset_info(ds)

        assert result == {
            "datasetId": "or-full-2024",
            "legalForm": "s.r.o.",
            "datasetType": "full",
            "location": "Praha",
            "year": 2024,
            "status": "completed",
            "lastSyncedAt": "2024-12-01T10:30:00",
            "entityCount": 5000,
        }

    def test_no_sync(self):
        ds = _mock_dataset_sync(last_synced_at=None)
        result = parse_dataset_info(ds)

        assert result["lastSyncedAt"] is None

    def test_pending_status(self):
        ds = _mock_dataset_sync(status="pending", entity_count=0)
        result = parse_dataset_info(ds)

        assert result["status"] == "pending"
        assert result["entityCount"] == 0


# ---------------------------------------------------------------------------
# parse_sync_status
# ---------------------------------------------------------------------------


class TestParseSyncStatus:
    def test_full_data(self):
        data = {
            "total_datasets": 100,
            "completed_datasets": 85,
            "failed_datasets": 5,
            "pending_datasets": 10,
            "last_sync_at": "2024-12-01T10:30:00Z",
            "total_entities": 250000,
        }
        result = parse_sync_status(data)

        assert result == {
            "totalDatasets": 100,
            "completedDatasets": 85,
            "failedDatasets": 5,
            "pendingDatasets": 10,
            "lastSyncAt": "2024-12-01T10:30:00Z",
            "totalEntities": 250000,
        }

    def test_all_zeros(self):
        data = {
            "total_datasets": 0,
            "completed_datasets": 0,
            "failed_datasets": 0,
            "pending_datasets": 0,
            "last_sync_at": None,
            "total_entities": 0,
        }
        result = parse_sync_status(data)

        assert result["totalDatasets"] == 0
        assert result["lastSyncAt"] is None
        assert result["totalEntities"] == 0
