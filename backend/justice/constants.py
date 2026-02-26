"""
Justice Open Data API constants.
Covers the CKAN API at dataor.justice.cz and reference data for Czech courts and legal forms.
"""

# --- Base URLs ---

JUSTICE_BASE_URL = "https://or.justice.cz"  # PDF document downloads (Sbirka listin)
JUSTICE_OPENDATA_URL = "https://dataor.justice.cz"
JUSTICE_CKAN_API_URL = "https://dataor.justice.cz/api/3/action"
JUSTICE_FILE_API_URL = "https://dataor.justice.cz/api/file"

# --- Timeouts ---

REQUEST_TIMEOUT = 30  # seconds (metadata API calls)
FILE_DOWNLOAD_TIMEOUT = 600  # 10 minutes (large .xml.gz files)
DOWNLOAD_CHUNK_SIZE = 8192  # bytes for streaming downloads

# --- Cache TTLs ---

ENTITY_DETAIL_CACHE_TTL = 3600  # 1 hour
ENTITY_SEARCH_CACHE_TTL = 900  # 15 minutes
DATASET_LIST_CACHE_TTL = 3600  # 1 hour
DOCUMENT_CACHE_TTL = 86400  # 24 hours (PDF parser, kept for legacy)

# --- Rate limiting ---

OUTBOUND_MAX_REQUESTS = 5
OUTBOUND_WINDOW = 60  # seconds

# --- PDF limits (kept for legacy PDF parser) ---

MAX_PDF_SIZE_MB = 50

# --- Court locations ---
# Maps dataset ID component to human-readable name.

COURT_LOCATIONS = {
    "praha": "Městský soud v Praze",
    "brno": "Krajský soud v Brně",
    "ostrava": "Krajský soud v Ostravě",
    "ceske_budejovice": "Krajský soud v Českých Budějovicích",
    "plzen": "Krajský soud v Plzni",
    "hradec_kralove": "Krajský soud v Hradci Králové",
    "usti_nad_labem": "Krajský soud v Ústí nad Labem",
}

# --- Legal forms ---
# Maps dataset ID prefix to Czech legal form name.

LEGAL_FORMS = {
    "sro": "Společnost s ručením omezeným",
    "as": "Akciová společnost",
    "spolek": "Spolek",
    "nad": "Nadace",
    "ks": "Komanditní společnost",
    "vos": "Veřejná obchodní společnost",
    "svj": "Společenství vlastníků jednotek",
    "dr": "Družstvo",
    "nadacni_fond": "Nadační fond",
    "ustav": "Ústav",
    "zspo": "Zájmové sdružení právnických osob",
    "ps": "Příspěvková organizace",
    "op": "Obecně prospěšná společnost",
    "se": "Evropská společnost",
    "sce": "Evropská družstevní společnost",
    "ehzs": "Evropské hospodářské zájmové sdružení",
    "ksk": "Komanditní společnost na akcie",
    "pobocny_spolek": "Pobočný spolek",
    "zahranicni_fo": "Zahraniční fyzická osoba",
    "zahranicni_po": "Zahraniční právnická osoba",
    "odborova_organizace": "Odborová organizace",
    "organizace_zamestnavatelu": "Organizace zaměstnavatelů",
    "mezinarodni_odborova_organizace": "Mezinárodní odborová organizace",
    "mezinarodni_organizace_zamestnavatelu": "Mezinárodní organizace zaměstnavatelů",
    "pobocna_odborova_organizace": "Pobočná odborová organizace",
    "pobocna_organizace_zamestnavatelu": "Pobočná organizace zaměstnavatelů",
    "pobocna_mezinarodni_odborova_organizace": "Pobočná mezinárodní odborová organizace",
    "pobocna_mezinarodni_organizace_zamestnavatelu": "Pobočná mezinárodní organizace zaměstnavatelů",
    "spolek_transformovany": "Spolek transformovaný",
    "zahranicni_pobocny_spolek": "Zahraniční pobočný spolek",
    "spolecenstvi_vlastniku_jednotek": "Společenství vlastníků jednotek",
    "fundace": "Fundace",
    "sdruzeni": "Sdružení",
    "organizacni_slozka_zahranicniho_fo": "Organizační složka zahraničního FO",
    "organizacni_slozka_zahranicniho_po": "Organizační složka zahraničního PO",
    "zahranicni_svjf": "Zahraniční SVJ/Fond",
    "organizacni_slozka_zahranicni_fo": "Organizační složka zahraniční FO",
    "organizacni_slozka_zahranicni_po": "Organizační složka zahraniční PO",
    "organizacni_slozka_zahranicniho_svjf": "Organizační složka zahraničního SVJ/Fond",
    "organizacni_slozka": "Organizační složka",
    "osoba_povinne_zapisovana": "Osoba povinně zapisovaná",
    "fyzicka_osoba_zapisovana_do_or": "Fyzická osoba zapisovaná do OR",
}

# --- Fact type codes ---
# Maps key udajTyp codes from the XML schema to English identifiers.

FACT_TYPE_CODES = {
    "SIDLO": "headquarters",
    "SPIS_ZN": "file_reference",
    "ICO": "company_id",
    "PRAVNI_FORMA": "legal_form",
    "NAZEV": "name",
    "STATUTARNI_ORGAN": "statutory_body",
    "STATUTARNI_ORGAN_CLEN": "statutory_body_member",
    "SPOLECNIK": "shareholders",
    "SPOLECNIK_OSOBA": "shareholder",
    "SPOLECNIK_PODIL": "share",
    "ZAKLADNI_KAPITAL": "registered_capital",
    "PREDMET_PODNIKANI_SEKCE": "business_activities",
    "PREDMET_PODNIKANI": "business_activity",
    "ZPUSOB_JEDNANI": "manner_of_acting",
    "POCET_CLENU": "member_count",
    "ZPUSOB_RIZENI": "governance_system",
    "PROKURA": "procuration",
    "LIKVIDATOR": "liquidator",
    "KONKURS": "bankruptcy",
    "INSOLVENCNI_RIZENI": "insolvency_proceedings",
    "EXEKUCE": "execution",
    "OSTATNI_SKUTECNOSTI": "other_facts",
    "DOZORCI_RADA": "supervisory_board",
    "DOZORCI_RADA_CLEN": "supervisory_board_member",
    "KONTROLNI_KOMISE": "audit_committee",
    "KONTROLNI_KOMISE_CLEN": "audit_committee_member",
    "JINE_PRAVNI_SKUTECNOSTI": "other_legal_facts",
    "AKCIE": "shares",
    "ZAKLADATEL": "founder",
    "UCEL": "purpose",
    "VEDLEJSI_CINNOST": "secondary_activity",
}
