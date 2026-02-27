"""
Parser for Czech účetní závěrka (financial statement) XML files.

These XMLs follow the EPO format (electronic tax filing), regulated by
Vyhláška 500/2002 Sb. The structure is:

  <UcetniZaverka>
    <VetaD>   — metadata (period, format type, currency)
    <VetaUA>  — Rozvaha AKTIVA (balance sheet assets), by c_radku
    <VetaUD>  — Rozvaha PASIVA (balance sheet liabilities/equity), by c_radku
    <VetaUB>  — VZZ P&L (income statement), by c_radku
  </UcetniZaverka>

Row numbers (c_radku) are legally standardized and map 1:1 to the official
Czech accounting form line items.
"""
from lxml import etree


# Rozvaha AKTIVA — key rows (zkrácený + plný rozsah)
AKTIVA_ROWS = {
    1: "AKTIVA CELKEM",
    2: "A. Pohledávky za upsaný základní kapitál",
    3: "B. Stálá aktiva",
    37: "C. Oběžná aktiva",
    74: "D. Časové rozlišení aktiv",
}

# Rozvaha PASIVA — key rows
PASIVA_ROWS = {
    1: "PASIVA CELKEM",
    2: "A. Vlastní kapitál",
    24: "B.+C. Cizí zdroje",
    25: "B. Rezervy",
    30: "C. Závazky",
    64: "D. Časové rozlišení pasiv",
}

# VZZ (Výkaz zisku a ztráty) — key rows (druhové členění, plný rozsah)
VZZ_ROWS = {
    1: "I. Tržby z prodeje výrobků a služeb",
    2: "II. Tržby za prodej zboží",
    3: "A. Výkonová spotřeba",
    4: "A.1. Náklady vynaložené na prodané zboží",
    5: "A.2. Spotřeba materiálu a energie",
    6: "A.3. Služby",
    7: "B. Změna stavu zásob vlastní činnosti (+/-)",
    8: "C. Aktivace (-)",
    9: "D. Osobní náklady",
    10: "D.1. Mzdové náklady",
    11: "D.2. Náklady na SZ, ZP a ostatní náklady",
    12: "D.2.1. Náklady na SZ a ZP",
    13: "D.2.2. Ostatní náklady",
    14: "E. Úpravy hodnot v provozní oblasti",
    15: "E.1. Úpravy hodnot DNM a DHM",
    16: "E.1.1. Úpravy hodnot DNM a DHM - trvalé",
    17: "E.1.2. Úpravy hodnot DNM a DHM - dočasné",
    18: "E.2. Úpravy hodnot zásob",
    19: "E.3. Úpravy hodnot pohledávek",
    20: "III. Ostatní provozní výnosy",
    21: "III.1. Tržby z prodeje DM",
    22: "III.2. Tržby z prodeje materiálu",
    23: "III.3. Jiné provozní výnosy",
    24: "F. Ostatní provozní náklady",
    25: "F.1. ZC prodaného DM",
    26: "F.2. ZC prodaného materiálu",
    27: "F.3. Daně a poplatky",
    28: "F.4. Rezervy v provozní oblasti a KNP",
    29: "F.5. Jiné provozní náklady",
    30: "* Provozní výsledek hospodaření (+/-)",
    31: "IV. Výnosy z DFM - podíly",
    32: "IV.1. Výnosy z podílů - ovládaná osoba",
    33: "IV.2. Ostatní výnosy z podílů",
    34: "G. Náklady vynaložené na prodané podíly",
    35: "V. Výnosy z ostatního DFM",
    36: "V.1. Výnosy z ost. DFM - ovládaná osoba",
    37: "V.2. Ostatní výnosy z ost. DFM",
    38: "H. Náklady související s ost. DFM",
    39: "VI. Výnosové úroky a podobné výnosy",
    40: "VI.1. Výnosové úroky - ovládaná osoba",
    41: "VI.2. Ostatní výnosové úroky",
    42: "I. Úpravy hodnot a rezervy ve fin. oblasti",
    43: "J. Nákladové úroky a podobné náklady",
    44: "J.1. Nákladové úroky - ovládaná osoba",
    45: "J.2. Ostatní nákladové úroky",
    46: "VII. Ostatní finanční výnosy",
    47: "K. Ostatní finanční náklady",
    48: "* Finanční výsledek hospodaření (+/-)",
    49: "** Výsledek hospodaření před zdaněním (+/-)",
    50: "L. Daň z příjmů",
    51: "L.1. Daň z příjmů - splatná",
    52: "L.2. Daň z příjmů - odložená (+/-)",
    53: "** Výsledek hospodaření po zdanění (+/-)",
    54: "M. Převod podílu na VH společníkům (+/-)",
    55: "*** Výsledek hospodaření za účetní období (+/-)",
    56: "* Čistý obrat za účetní období",
}

# Rozsah labels
ROZSAH_LABELS = {
    "P": "plný",
    "Z": "zkrácený",
    "M": "mikro",
}


def parse_financial_xml(xml_bytes: bytes) -> dict | None:
    """
    Parse an účetní závěrka XML file into structured financial data.

    Returns None if the XML cannot be parsed.
    """
    try:
        root = etree.fromstring(xml_bytes)
    except etree.XMLSyntaxError:
        return None

    if root.tag != "UcetniZaverka":
        return None

    veta_d = root.find("VetaD")
    if veta_d is None:
        return None

    metadata = _parse_metadata(veta_d)
    aktiva = _parse_rows(root, "VetaUA", AKTIVA_ROWS, has_brutto=True)
    pasiva = _parse_rows(root, "VetaUD", PASIVA_ROWS, has_brutto=False)
    vzz = _parse_rows(root, "VetaUB", VZZ_ROWS, has_brutto=False)

    return {
        "metadata": metadata,
        "aktiva": aktiva,
        "pasiva": pasiva,
        "vzz": vzz,
    }


def _parse_metadata(veta_d) -> dict:
    """Extract metadata from VetaD element."""
    period_from = veta_d.get("zdobd_od", "")
    period_to = veta_d.get("d_uv", "")
    rozsah_rozv = veta_d.get("uv_rozsah_rozv", "")
    rozsah_vzz = veta_d.get("uv_rozsah_vzz", "")

    return {
        "periodFrom": period_from,
        "periodTo": period_to,
        "currency": veta_d.get("uv_mena", "CZK"),
        "unit": "thousands",  # always in tis. CZK
        "rozsahRozvaha": ROZSAH_LABELS.get(rozsah_rozv, rozsah_rozv),
        "rozsahVzz": ROZSAH_LABELS.get(rozsah_vzz, rozsah_vzz),
    }


def _parse_rows(root, tag: str, row_labels: dict, has_brutto: bool) -> list[dict]:
    """Parse VetaUA/VetaUD/VetaUB rows into a list of labeled entries."""
    rows = []
    for elem in root.findall(tag):
        row_num = _safe_int(elem.get("c_radku"))
        if row_num is None:
            continue

        label = row_labels.get(row_num, "")

        entry = {
            "row": row_num,
            "label": label,
        }

        if has_brutto:
            # VetaUA has brutto/korekce/netto columns
            entry["brutto"] = _safe_int(elem.get("kc_brutto"))
            entry["korekce"] = _safe_int(elem.get("kc_korekce"))
            entry["netto"] = _safe_int(elem.get("kc_netto"))
            entry["nettoMin"] = _safe_int(elem.get("kc_netto_min"))
        else:
            # VetaUD/VetaUB have sled (current) / min (previous)
            entry["current"] = _safe_int(elem.get("kc_sled"))
            entry["previous"] = _safe_int(elem.get("kc_min"))

        rows.append(entry)

    return rows


def _safe_int(value: str | None) -> int | None:
    """Convert string to int, return None on failure."""
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None
