"""
Transforms Justice DB model instances to camelCase API response dicts.
Every function is pure — no I/O, no side effects, no database calls.
Input:  Django model instances or raw dicts from DB queries.
Output: English dicts matching the TypeScript entity types (camelCase keys).
"""
from __future__ import annotations


def parse_entity_detail(entity, facts: list) -> dict:
    """Full entity representation with nested facts, persons, and addresses."""
    return {
        "ico": entity.ico,
        "name": entity.name,
        "legalFormCode": entity.legal_form_code,
        "legalFormName": entity.legal_form_name,
        "courtCode": entity.court_code,
        "courtName": entity.court_name,
        "fileSection": entity.file_section,
        "fileNumber": entity.file_number,
        "fileReference": entity.file_reference,
        "registrationDate": _date_str(entity.registration_date),
        "deletionDate": _date_str(entity.deletion_date),
        "isActive": entity.is_active,
        "facts": [_parse_fact(f) for f in facts if f.parent_fact_id is None],
    }


def parse_entity_summary(entity) -> dict:
    """Lightweight entity representation for search results."""
    return {
        "ico": entity.ico,
        "name": entity.name,
        "legalFormCode": entity.legal_form_code,
        "legalFormName": entity.legal_form_name,
        "courtName": entity.court_name,
        "fileReference": entity.file_reference,
        "registrationDate": _date_str(entity.registration_date),
        "deletionDate": _date_str(entity.deletion_date),
        "isActive": entity.is_active,
    }


def parse_history_entry(fact) -> dict:
    """Transform a fact into a timeline entry."""
    return {
        "date": _date_str(fact.registration_date) or _date_str(fact.deletion_date) or "",
        "action": "deleted" if fact.deletion_date else "registered",
        "factTypeCode": fact.fact_type_code,
        "factTypeName": fact.fact_type_name,
        "header": fact.header,
        "valueText": fact.value_text,
    }


def parse_person_with_fact(fact) -> dict:
    """Transform a fact with its person into a person API dict."""
    person = fact.person
    return {
        "isNaturalPerson": person.is_natural_person,
        "firstName": person.first_name,
        "lastName": person.last_name,
        "birthDate": _date_str(person.birth_date),
        "titleBefore": person.title_before,
        "titleAfter": person.title_after,
        "entityName": person.entity_name,
        "entityIco": person.entity_ico,
        "functionName": fact.function_name,
        "functionFrom": _date_str(fact.function_from),
        "functionTo": _date_str(fact.function_to),
        "membershipFrom": _date_str(fact.membership_from),
        "membershipTo": _date_str(fact.membership_to),
        "registrationDate": _date_str(fact.registration_date),
        "deletionDate": _date_str(fact.deletion_date),
    }


def parse_address(address) -> dict:
    """Transform an Address model instance to an API dict."""
    return {
        "addressType": address.address_type,
        "country": address.country,
        "municipality": address.municipality,
        "cityPart": address.city_part,
        "street": address.street,
        "houseNumber": address.house_number,
        "orientationNumber": address.orientation_number,
        "postalCode": address.postal_code,
        "district": address.district,
        "fullAddress": address.full_address,
    }


def parse_dataset_info(ds) -> dict:
    """Transform a DatasetSync model instance to an API dict."""
    return {
        "datasetId": ds.dataset_id,
        "legalForm": ds.legal_form,
        "datasetType": ds.dataset_type,
        "location": ds.location,
        "year": ds.year,
        "status": ds.status,
        "lastSyncedAt": ds.last_synced_at.isoformat() if ds.last_synced_at else None,
        "entityCount": ds.entity_count,
    }


def parse_sync_status(data: dict) -> dict:
    """Transform aggregated sync data into the API response shape."""
    return {
        "totalDatasets": data["total_datasets"],
        "completedDatasets": data["completed_datasets"],
        "failedDatasets": data["failed_datasets"],
        "pendingDatasets": data["pending_datasets"],
        "lastSyncAt": data["last_sync_at"],
        "totalEntities": data["total_entities"],
    }


# --- Internal helpers ---


def _parse_fact(fact) -> dict:
    """Transform a single EntityFact into an API dict with nested person/addresses."""
    person = None
    try:
        p = fact.person
        person = {
            "isNaturalPerson": p.is_natural_person,
            "firstName": p.first_name,
            "lastName": p.last_name,
            "birthDate": _date_str(p.birth_date),
            "titleBefore": p.title_before,
            "titleAfter": p.title_after,
            "entityName": p.entity_name,
            "entityIco": p.entity_ico,
        }
    except Exception:
        pass

    addresses = []
    try:
        for addr in fact.addresses.all():
            addresses.append(parse_address(addr))
    except Exception:
        pass

    sub_facts = []
    try:
        for sf in fact.sub_facts.all():
            sub_facts.append(_parse_fact(sf))
    except Exception:
        pass

    return {
        "header": fact.header,
        "factTypeCode": fact.fact_type_code,
        "factTypeName": fact.fact_type_name,
        "valueText": fact.value_text,
        "valueData": fact.value_data,
        "registrationDate": _date_str(fact.registration_date),
        "deletionDate": _date_str(fact.deletion_date),
        "functionName": fact.function_name,
        "functionFrom": _date_str(fact.function_from),
        "functionTo": _date_str(fact.function_to),
        "person": person,
        "addresses": addresses,
        "subFacts": sub_facts,
    }


def _date_str(value) -> str | None:
    """Convert a date to ISO string or return None."""
    if value is None:
        return None
    return value.isoformat() if hasattr(value, "isoformat") else str(value)
