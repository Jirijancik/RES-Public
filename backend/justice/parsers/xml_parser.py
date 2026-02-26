"""
Streaming XML parser for Czech Justice open data files.

Uses lxml iterparse to process one <Subjekt> at a time, enabling parsing of
files hundreds of megabytes in size without loading the entire DOM into memory.

Handles gzip-compressed input streams transparently.

Every function is pure or a generator — no database calls, no side effects
beyond yielding parsed dicts.
"""
import gzip
from io import BytesIO
from typing import Iterator

from lxml import etree


def parse_xml_stream(data_stream: Iterator[bytes]) -> Iterator[dict]:
    """
    Parse a gzipped XML stream, yielding one Subjekt dict at a time.

    Args:
        data_stream: Iterator of raw bytes (gzip-compressed XML).

    Yields:
        Parsed Subjekt record with all nested udaje, osoba, adresa.
    """
    raw_buffer = BytesIO()
    for chunk in data_stream:
        raw_buffer.write(chunk)
    raw_buffer.seek(0)

    with gzip.GzipFile(fileobj=raw_buffer) as gz_file:
        context = etree.iterparse(gz_file, events=("end",), tag="Subjekt")
        for _event, elem in context:
            yield _parse_subjekt(elem)
            # Free memory: clear this element and remove preceding siblings.
            elem.clear()
            while elem.getprevious() is not None:
                del elem.getparent()[0]


def parse_xml_bytes(xml_bytes: bytes, is_gzipped: bool = False) -> Iterator[dict]:
    """
    Parse XML from bytes. Convenience for testing or small files.

    Args:
        xml_bytes: Raw XML content (optionally gzip-compressed).
        is_gzipped: Whether the input is gzip-compressed.

    Yields:
        Parsed Subjekt records.
    """
    if is_gzipped:
        xml_bytes = gzip.decompress(xml_bytes)
    root = etree.fromstring(xml_bytes)
    for subjekt in root.findall("Subjekt"):
        yield _parse_subjekt(subjekt)


def _parse_subjekt(elem) -> dict:
    """Parse a single <Subjekt> element into a dict."""
    return {
        "name": _text(elem, "nazev"),
        "ico": _text(elem, "ico"),
        "registration_date": _text(elem, "zapisDatum"),
        "deletion_date": _text(elem, "vymazDatum"),
        "facts": [_parse_udaj(u) for u in elem.findall("udaje/Udaj")],
    }


def _parse_udaj(elem) -> dict:
    """Parse a single <Udaj> element into a dict. Recurses for podudaje."""
    return {
        "header": _text(elem, "hlavicka"),
        "registration_date": _text(elem, "zapisDatum"),
        "deletion_date": _text(elem, "vymazDatum"),
        "value_text": _text(elem, "hodnotaText"),
        "value_data": _parse_hodnota_udaje(elem.find("hodnotaUdaje")),
        "membership_from": _text(elem, "clenstviOd"),
        "membership_to": _text(elem, "clenstviDo"),
        "function_from": _text(elem, "funkceOd"),
        "function_to": _text(elem, "funkceDo"),
        "function_name": _text(elem, "funkce"),
        "fact_type": _parse_udaj_typ(elem.find("udajTyp")),
        "legal_form": _parse_pravni_forma(elem.find("pravniForma")),
        "file_reference": _parse_spis_zn(elem.find("spisZn")),
        "person": _parse_osoba(elem.find("osoba")),
        "address": _parse_adresa(elem.find("adresa")),
        "residence": _parse_adresa(elem.find("bydliste")),
        "sub_facts": [_parse_udaj(u) for u in elem.findall("podudaje/Udaj")],
    }


def _parse_udaj_typ(elem) -> dict | None:
    """Parse <udajTyp> — type code and name for a fact."""
    if elem is None:
        return None
    return {
        "code": _text(elem, "kod"),
        "name": _text(elem, "nazev"),
    }


def _parse_pravni_forma(elem) -> dict | None:
    """Parse <pravniForma> — legal form code, name, abbreviation."""
    if elem is None:
        return None
    return {
        "code": _text(elem, "kod"),
        "name": _text(elem, "nazev"),
        "abbreviation": _text(elem, "zkratka"),
    }


def _parse_spis_zn(elem) -> dict | None:
    """Parse <spisZn> — file reference with court details."""
    if elem is None:
        return None
    soud = elem.find("soud")
    return {
        "court_code": _text(soud, "kod") if soud is not None else "",
        "court_name": _text(soud, "nazev") if soud is not None else "",
        "section": _text(elem, "oddil"),
        "insert": _text(elem, "vlozka"),
    }


def _parse_osoba(elem) -> dict | None:
    """Parse <osoba> — natural person (has prijmeni) or legal person (has nazev)."""
    if elem is None:
        return None
    result = {"person_text": _text(elem, "osobaText")}
    if elem.find("prijmeni") is not None:
        result.update({
            "type": "natural",
            "first_name": _text(elem, "jmeno"),
            "last_name": _text(elem, "prijmeni"),
            "birth_date": _text(elem, "narozDatum"),
            "title_before": _text(elem, "titulPred"),
            "title_after": _text(elem, "titulZa"),
        })
    else:
        result.update({
            "type": "legal",
            "entity_name": _text(elem, "nazev"),
            "ico": _text(elem, "ico"),
            "reg_number": _text(elem, "regCislo"),
            "euid": _text(elem, "euid"),
        })
    return result


def _parse_adresa(elem) -> dict | None:
    """Parse <adresa> or <bydliste> — full address with all components."""
    if elem is None:
        return None
    return {
        "country": _text(elem, "statNazev"),
        "municipality": _text(elem, "obec"),
        "city_part": _text(elem, "castObce"),
        "street": _text(elem, "ulice"),
        "house_number": _text(elem, "cisloPo"),
        "orientation_number": _text(elem, "cisloOr"),
        "evidence_number": _text(elem, "cisloEv"),
        "number_text": _text(elem, "cisloText"),
        "postal_code": _text(elem, "psc"),
        "district": _text(elem, "okres"),
        "full_address": _text(elem, "adresaText"),
        "supplementary_text": _text(elem, "doplnujiciText"),
    }


def _parse_hodnota_udaje(elem) -> dict | None:
    """Parse <hodnotaUdaje> — xs:any content, converted to a flat dict."""
    if elem is None:
        return None
    result = {}
    for child in elem:
        tag = etree.QName(child).localname
        if len(child):
            result[tag] = {
                etree.QName(gc).localname: (gc.text or "").strip()
                for gc in child
            }
        else:
            result[tag] = (child.text or "").strip()
    return result or None


def _text(elem, tag: str) -> str:
    """Safely get text content of a child element."""
    if elem is None:
        return ""
    child = elem.find(tag)
    return (child.text or "").strip() if child is not None else ""
