# Sbírka Listin (Document Collection) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Sbírka listin" section to the justice entity detail page that fetches documents from or.justice.cz, parses financial XML data when available, and shows PDF previews for non-XML documents.

**Architecture:** Backend scrapes or.justice.cz in 3 steps (ICO→subjektId→document list→file details), parses XML financial statements into structured data, and proxies PDF downloads. Frontend adds a lazy-loaded section on the entity detail page triggered by user click. Financial data renders as tables; non-XML documents show as iframe PDF previews (latest 3) + download links.

**Tech Stack:** Django REST Framework, lxml, requests (scraping), React Query (lazy queries), Next.js App Router, Tailwind CSS, shadcn/ui components.

---

## Task 1: Backend — Sbírka Listin Client

**Files:**
- Modify: `backend/justice/client.py`
- Modify: `backend/justice/constants.py`

**Step 1: Add constants**

In `backend/justice/constants.py`, add at the end:

```python
# Sbírka listin scraping
SBIRKA_LISTIN_CACHE_TTL = 3600  # 1 hour — document lists don't change often
SBIRKA_FINANCIAL_CACHE_TTL = 86400 * 30  # 30 days — financial data is immutable once filed
SBIRKA_REQUEST_TIMEOUT = 15  # seconds per page scrape
```

**Step 2: Add JusticeSbirkaClient to client.py**

Append to `backend/justice/client.py`:

```python
import re
from typing import Iterator


class JusticeSbirkaClient:
    """
    Scrapes or.justice.cz HTML pages to retrieve Sbírka listin documents.

    3-step pipeline:
    1. ICO → subjektId  (search page)
    2. subjektId → document list  (sbírka listin page)
    3. document → file download links  (detail page)
    """

    def __init__(self):
        self.session = requests.Session()
        self.session.verify = _VERIFY_SSL
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (compatible; GTDN-Backend/1.0)",
            "Accept": "text/html",
        })

    def get_subjekt_id(self, ico: str) -> str | None:
        """Search or.justice.cz by ICO to get the internal subjektId."""
        url = f"{JUSTICE_BASE_URL}/ias/ui/rejstrik-$firma"
        try:
            resp = self.session.get(
                url, params={"ico": ico}, timeout=SBIRKA_REQUEST_TIMEOUT
            )
            resp.raise_for_status()
        except requests.RequestException:
            return None

        match = re.search(r"subjektId=(\d+)", resp.text)
        return match.group(1) if match else None

    def get_document_list(self, subjekt_id: str) -> list[dict]:
        """Fetch the sbírka listin page and parse the document table."""
        url = f"{JUSTICE_BASE_URL}/ias/ui/vypis-sl-firma"
        try:
            resp = self.session.get(
                url, params={"subjektId": subjekt_id},
                timeout=SBIRKA_REQUEST_TIMEOUT,
            )
            resp.raise_for_status()
        except requests.RequestException:
            return []

        return self._parse_document_table(resp.text, subjekt_id)

    def get_document_files(self, document_id: str, subjekt_id: str, spis_id: str) -> list[dict]:
        """Fetch the detail page for a document and extract file download links."""
        url = f"{JUSTICE_BASE_URL}/ias/ui/vypis-sl-detail"
        try:
            resp = self.session.get(
                url,
                params={
                    "dokument": document_id,
                    "subjektId": subjekt_id,
                    "spis": spis_id,
                },
                timeout=SBIRKA_REQUEST_TIMEOUT,
            )
            resp.raise_for_status()
        except requests.RequestException:
            return []

        return self._parse_file_links(resp.text)

    def download_file(self, download_id: str) -> tuple[bytes, str, str]:
        """
        Download a file by its download UUID.

        Returns: (content_bytes, content_type, filename)
        """
        url = f"{JUSTICE_BASE_URL}/ias/content/download"
        try:
            resp = self.session.get(
                url, params={"id": download_id},
                timeout=SBIRKA_REQUEST_TIMEOUT,
            )
            resp.raise_for_status()
        except requests.RequestException as e:
            raise ExternalAPIError(
                "Failed to download document from justice.cz",
                service_name="justice",
            )

        content_type = resp.headers.get("content-type", "application/octet-stream")
        disposition = resp.headers.get("content-disposition", "")
        filename_match = re.search(r'filename="?([^";\n]+)"?', disposition)
        filename = filename_match.group(1) if filename_match else "document"

        return resp.content, content_type, filename

    def _parse_document_table(self, html: str, subjekt_id: str) -> list[dict]:
        """Parse the sbírka listin HTML table into structured document dicts."""
        docs = []
        # Pattern: detail link + document types
        detail_pattern = re.compile(
            r'vypis-sl-detail\?dokument=(\d+)&amp;subjektId=\d+&amp;spis=(\d+)'
        )
        type_pattern = re.compile(r'class="symbol">([^<]+)</span>')

        # Find document number pattern (e.g. "C 257831/SL11/MSPH")
        number_pattern = re.compile(
            r'vypis-sl-detail[^>]*><span>([^<]+)</span>'
        )

        detail_matches = list(detail_pattern.finditer(html))
        type_matches = list(type_pattern.finditer(html))
        number_matches = list(number_pattern.finditer(html))

        for i, detail_match in enumerate(detail_matches):
            doc_id = detail_match.group(1)
            spis_id = detail_match.group(2)

            # Collect all type spans until the next detail link
            doc_types = []
            if i < len(type_matches):
                # Types appear between this detail link and the next
                start_pos = detail_match.end()
                end_pos = (
                    detail_matches[i + 1].start()
                    if i + 1 < len(detail_matches)
                    else len(html)
                )
                for tm in type_matches:
                    if start_pos <= tm.start() < end_pos:
                        doc_types.append(tm.group(1))

            doc_number = ""
            if i < len(number_matches):
                raw = number_matches[i].group(1)
                doc_number = raw.replace("\xa0", " ").strip()

            docs.append({
                "documentId": doc_id,
                "subjektId": subjekt_id,
                "spisId": spis_id,
                "documentNumber": doc_number,
                "documentType": ", ".join(doc_types) if doc_types else "",
            })

        return docs

    def _parse_file_links(self, html: str) -> list[dict]:
        """Parse the detail page HTML to extract download links with metadata."""
        files = []
        # Pattern: download link + filename + optional size/pages
        link_pattern = re.compile(
            r'download\?id=([a-f0-9-]+)"[^>]*>\s*(?:<[^>]+>)?\s*([^<]+)'
        )
        for match in link_pattern.finditer(html):
            download_id = match.group(1)
            filename = match.group(2).strip()

            # Skip GDPR/privacy PDF links
            if "GDPR" in filename or "Informace" in filename:
                continue

            is_xml = filename.lower().endswith(".xml")
            is_pdf = filename.lower().endswith(".pdf")

            # Try to extract size and page count from surrounding text
            # Pattern: "(159 kB, počet stran: 5)" or "(0 kB)"
            context = html[match.end():match.end() + 100]
            size_match = re.search(r"\((\d+)\s*kB", context)
            pages_match = re.search(r"počet stran:\s*(\d+)", context)

            files.append({
                "downloadId": download_id,
                "filename": filename,
                "sizeKb": int(size_match.group(1)) if size_match else None,
                "pageCount": int(pages_match.group(1)) if pages_match else None,
                "isXml": is_xml,
                "isPdf": is_pdf,
            })

        return files


# Module-level singleton
justice_sbirka_client = JusticeSbirkaClient()
```

**Step 3: Commit**

```bash
git add backend/justice/client.py backend/justice/constants.py
git commit -m "feat(justice): add JusticeSbirkaClient for sbírka listin scraping"
```

---

## Task 2: Backend — XML Financial Data Parser

**Files:**
- Create: `backend/justice/parsers/financial_xml_parser.py`

**Step 1: Create the parser**

```python
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
```

**Step 2: Commit**

```bash
git add backend/justice/parsers/financial_xml_parser.py
git commit -m "feat(justice): add XML financial statement parser (VetaUA/VetaUD/VetaUB)"
```

---

## Task 3: Backend — Documents Service + View + Serializers

**Files:**
- Modify: `backend/justice/services.py` — add `get_entity_documents` method
- Modify: `backend/justice/views.py` — add `EntityDocumentsView` and `DocumentProxyView`
- Modify: `backend/justice/serializers.py` — add output serializers
- Modify: `backend/justice/urls.py` — add routes
- Modify: `backend/justice/parser.py` — add `parse_document_list` function

**Step 1: Add parser function in parser.py**

Append to `backend/justice/parser.py`:

```python
def parse_document_list(documents: list[dict]) -> list[dict]:
    """Transform scraped document data to API response shape."""
    return [
        {
            "documentId": doc["documentId"],
            "subjektId": doc["subjektId"],
            "spisId": doc["spisId"],
            "documentNumber": doc.get("documentNumber", ""),
            "documentType": doc.get("documentType", ""),
            "files": doc.get("files", []),
            "financialData": doc.get("financialData"),
        }
        for doc in documents
    ]
```

**Step 2: Add serializers in serializers.py**

Append to `backend/justice/serializers.py`:

```python
class DocumentFileSerializer(serializers.Serializer):
    downloadId = serializers.CharField()
    filename = serializers.CharField()
    sizeKb = serializers.IntegerField(allow_null=True, required=False)
    pageCount = serializers.IntegerField(allow_null=True, required=False)
    isXml = serializers.BooleanField()
    isPdf = serializers.BooleanField()


class FinancialRowSerializer(serializers.Serializer):
    row = serializers.IntegerField()
    label = serializers.CharField(allow_blank=True)
    brutto = serializers.IntegerField(allow_null=True, required=False)
    korekce = serializers.IntegerField(allow_null=True, required=False)
    netto = serializers.IntegerField(allow_null=True, required=False)
    nettoMin = serializers.IntegerField(allow_null=True, required=False)
    current = serializers.IntegerField(allow_null=True, required=False)
    previous = serializers.IntegerField(allow_null=True, required=False)


class FinancialMetadataSerializer(serializers.Serializer):
    periodFrom = serializers.CharField()
    periodTo = serializers.CharField()
    currency = serializers.CharField()
    unit = serializers.CharField()
    rozsahRozvaha = serializers.CharField(allow_blank=True)
    rozsahVzz = serializers.CharField(allow_blank=True)


class FinancialDataSerializer(serializers.Serializer):
    metadata = FinancialMetadataSerializer()
    aktiva = FinancialRowSerializer(many=True)
    pasiva = FinancialRowSerializer(many=True)
    vzz = FinancialRowSerializer(many=True)


class DocumentSerializer(serializers.Serializer):
    documentId = serializers.CharField()
    subjektId = serializers.CharField()
    spisId = serializers.CharField()
    documentNumber = serializers.CharField(allow_blank=True)
    documentType = serializers.CharField(allow_blank=True)
    files = DocumentFileSerializer(many=True)
    financialData = FinancialDataSerializer(allow_null=True, required=False)


class DocumentListSerializer(serializers.Serializer):
    subjektId = serializers.CharField()
    documents = DocumentSerializer(many=True)
```

**Step 3: Add service method in services.py**

Add this import at top of `backend/justice/services.py`:

```python
from .client import justice_sbirka_client
from .parsers.financial_xml_parser import parse_financial_xml
```

Add this method to `JusticeService`:

```python
    def get_entity_documents(self, ico: str) -> dict:
        """
        Get sbírka listin documents for an entity.

        Scrapes or.justice.cz HTML pages, parses document lists,
        and extracts financial XML data when available.
        """
        normalized = ico.zfill(8)

        cached = self.cache.get("documents", normalized)
        if cached is not None:
            return cached

        client = justice_sbirka_client

        # Step 1: ICO → subjektId
        subjekt_id = client.get_subjekt_id(normalized)
        if not subjekt_id:
            raise ExternalAPIError(
                "Entity not found on or.justice.cz",
                status_code=404,
                service_name="justice",
            )

        # Step 2: subjektId → document list
        documents = client.get_document_list(subjekt_id)

        # Step 3: For each document, get file details and parse XML if present
        for doc in documents:
            files = client.get_document_files(
                doc["documentId"], doc["subjektId"], doc["spisId"]
            )
            doc["files"] = files

            # Try to find and parse XML financial data
            xml_file = next((f for f in files if f["isXml"]), None)
            if xml_file:
                try:
                    content, content_type, filename = client.download_file(
                        xml_file["downloadId"]
                    )
                    if content and b"<UcetniZaverka" in content:
                        doc["financialData"] = parse_financial_xml(content)
                    else:
                        doc["financialData"] = None
                except Exception:
                    doc["financialData"] = None
            else:
                doc["financialData"] = None

        result = {
            "subjektId": subjekt_id,
            "documents": parse_document_list(documents),
        }

        self.cache.set(
            result, "documents", normalized,
            ttl=SBIRKA_LISTIN_CACHE_TTL,
        )
        return result
```

Also add import for `SBIRKA_LISTIN_CACHE_TTL` from `.constants`.

**Step 4: Add views in views.py**

Add to imports:

```python
from django.http import HttpResponse
from .client import justice_sbirka_client
```

Add these views:

```python
class EntityDocumentsView(APIView):
    """GET /v1/justice/entities/{ico}/documents/"""

    def get(self, request, ico):
        service = JusticeService()
        result = service.get_entity_documents(ico)

        return Response(DocumentListSerializer(result).data)


class DocumentProxyView(APIView):
    """
    GET /v1/justice/documents/{download_id}/

    Proxies PDF/XML downloads from or.justice.cz.
    Required because the justice.cz server needs session cookies
    that browsers can't set cross-origin.
    """

    def get(self, request, download_id):
        client = justice_sbirka_client

        try:
            content, content_type, filename = client.download_file(download_id)
        except Exception:
            return Response(
                {"error": "Failed to download document"},
                status=502,
            )

        response = HttpResponse(content, content_type=content_type)
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        # Allow iframe embedding
        response["X-Frame-Options"] = "SAMEORIGIN"
        return response
```

**Step 5: Add routes in urls.py**

Add to imports:

```python
from .views import DocumentProxyView, EntityDocumentsView
```

Add to `urlpatterns`:

```python
    path("entities/<str:ico>/documents/", EntityDocumentsView.as_view(), name="entity-documents"),
    path("documents/<str:download_id>/", DocumentProxyView.as_view(), name="document-proxy"),
```

**Step 6: Add import of parse_document_list and SBIRKA_LISTIN_CACHE_TTL**

In `services.py`, add to the import from `.parser`:
```python
from .parser import (
    ...,
    parse_document_list,
)
```

And add to the import from `.constants`:
```python
from .constants import (
    ...,
    SBIRKA_LISTIN_CACHE_TTL,
)
```

**Step 7: Commit**

```bash
git add backend/justice/services.py backend/justice/views.py backend/justice/serializers.py backend/justice/urls.py backend/justice/parser.py
git commit -m "feat(justice): add documents endpoint with XML financial parsing and PDF proxy"
```

---

## Task 4: Frontend — Types, Endpoints, Query Hook

**Files:**
- Modify: `src/lib/justice/justice.types.ts` — add document types
- Modify: `src/lib/justice/justice.endpoints.ts` — add documents endpoint
- Modify: `src/lib/justice/justice.keys.ts` — add documents key
- Modify: `src/lib/justice/justice.queries.ts` — add lazy query hook
- Modify: `src/lib/justice/index.ts` — re-export new types

**Step 1: Add types in justice.types.ts**

Append before the `// --- History ---` section:

```typescript
// --- Sbírka listin (document collection) ---

export interface JusticeDocumentFile {
  downloadId: string;
  filename: string;
  sizeKb: number | null;
  pageCount: number | null;
  isXml: boolean;
  isPdf: boolean;
}

export interface JusticeFinancialRow {
  row: number;
  label: string;
  brutto?: number | null;
  korekce?: number | null;
  netto?: number | null;
  nettoMin?: number | null;
  current?: number | null;
  previous?: number | null;
}

export interface JusticeFinancialMetadata {
  periodFrom: string;
  periodTo: string;
  currency: string;
  unit: string;
  rozsahRozvaha: string;
  rozsahVzz: string;
}

export interface JusticeFinancialData {
  metadata: JusticeFinancialMetadata;
  aktiva: JusticeFinancialRow[];
  pasiva: JusticeFinancialRow[];
  vzz: JusticeFinancialRow[];
}

export interface JusticeDocument {
  documentId: string;
  subjektId: string;
  spisId: string;
  documentNumber: string;
  documentType: string;
  files: JusticeDocumentFile[];
  financialData: JusticeFinancialData | null;
}

export interface JusticeDocumentList {
  subjektId: string;
  documents: JusticeDocument[];
}
```

**Step 2: Add endpoint in justice.endpoints.ts**

Add to imports:

```typescript
import type { JusticeDocumentList } from "./justice.types";
```

Add to `justiceEndpoints` object:

```typescript
  /**
   * Get sbírka listin documents for an entity
   * GET /justice/entities/{ico}/documents/
   */
  async getDocuments(ico: string): Promise<JusticeDocumentList> {
    try {
      const response = await apiClient.get<JusticeDocumentList>(
        `/justice/entities/${ico}/documents/`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },
```

**Step 3: Add query key in justice.keys.ts**

Add to the `justiceKeys` object:

```typescript
  documents: (ico: string) => [...justiceKeys.detail(ico), "documents"] as const,
```

**Step 4: Add lazy query hook in justice.queries.ts**

Add to imports:

```typescript
import type { JusticeDocumentList } from "./justice.types";
```

Add:

```typescript
/**
 * Hook to fetch sbírka listin documents.
 * Disabled by default — enable by setting `enabled: true` when the user clicks.
 */
export function useJusticeDocuments(ico: string, enabled: boolean = false) {
  return useQuery({
    queryKey: justiceKeys.documents(ico),
    queryFn: () => justiceEndpoints.getDocuments(ico),
    enabled: enabled && Boolean(ico) && ico.length >= 1,
  });
}
```

**Step 5: Re-export in index.ts**

Add new types to the re-export in `src/lib/justice/index.ts`.

**Step 6: Commit**

```bash
git add src/lib/justice/
git commit -m "feat(justice): add frontend types, endpoint, and lazy query for documents"
```

---

## Task 5: Frontend — Document Components

**Files:**
- Create: `src/components/justice/justice-documents-section.tsx`
- Create: `src/components/justice/justice-financial-table.tsx`
- Create: `src/components/justice/justice-document-card.tsx`
- Modify: `src/components/justice/justice-detail.tsx` — add documents section
- Modify: `src/components/justice/index.ts` — export new components

**Step 1: Create justice-financial-table.tsx**

```typescript
"use client";

import { useTranslation } from "react-i18next";
import type { JusticeFinancialData, JusticeFinancialRow } from "@/lib/justice";

interface JusticeFinancialTableProps {
  data: JusticeFinancialData;
}

function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("cs-CZ").format(value);
}

function FinancialRows({
  rows,
  hasbrutto,
}: {
  rows: JusticeFinancialRow[];
  hasbrutto: boolean;
}) {
  const { t } = useTranslation("forms");

  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4 font-medium">{t("justice.documents.financials.item")}</th>
            {hasbrutto ? (
              <>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">
                  {t("justice.documents.financials.brutto")}
                </th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">
                  {t("justice.documents.financials.korekce")}
                </th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">
                  {t("justice.documents.financials.netto")}
                </th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">
                  {t("justice.documents.financials.nettoMin")}
                </th>
              </>
            ) : (
              <>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">
                  {t("justice.documents.financials.current")}
                </th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">
                  {t("justice.documents.financials.previous")}
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSummary = row.label.startsWith("*");
            return (
              <tr
                key={row.row}
                className={`border-b last:border-0 ${isSummary ? "font-semibold bg-muted/30" : ""}`}
              >
                <td className="py-1.5 pr-4">{row.label || `Řádek ${row.row}`}</td>
                {hasbrutto ? (
                  <>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                      {formatAmount(row.brutto)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                      {formatAmount(row.korekce)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                      {formatAmount(row.netto)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                      {formatAmount(row.nettoMin)}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                      {formatAmount(row.current)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                      {formatAmount(row.previous)}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function JusticeFinancialTable({ data }: JusticeFinancialTableProps) {
  const { t } = useTranslation("forms");

  return (
    <div className="space-y-6">
      <div className="text-muted-foreground text-xs">
        {t("justice.documents.financials.period", {
          from: data.metadata.periodFrom,
          to: data.metadata.periodTo,
        })}{" "}
        ({data.metadata.currency}, {t("justice.documents.financials.inThousands")})
      </div>

      {data.aktiva.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">
            {t("justice.documents.financials.aktiva")}
          </h4>
          <FinancialRows rows={data.aktiva} hasbrutto={true} />
        </div>
      )}

      {data.pasiva.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">
            {t("justice.documents.financials.pasiva")}
          </h4>
          <FinancialRows rows={data.pasiva} hasbrutto={false} />
        </div>
      )}

      {data.vzz.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">
            {t("justice.documents.financials.vzz")}
          </h4>
          <FinancialRows rows={data.vzz} hasbrutto={false} />
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create justice-document-card.tsx**

```typescript
"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDownIcon, FileTextIcon, DownloadIcon } from "lucide-react";
import { JusticeFinancialTable } from "./justice-financial-table";
import type { JusticeDocument } from "@/lib/justice";

interface JusticeDocumentCardProps {
  document: JusticeDocument;
  showPdfPreviews: boolean;
}

export function JusticeDocumentCard({ document: doc, showPdfPreviews }: JusticeDocumentCardProps) {
  const { t } = useTranslation("forms");
  const [isOpen, setIsOpen] = useState(!!doc.financialData);

  const pdfFiles = doc.files.filter((f) => f.isPdf);
  const previewFiles = showPdfPreviews ? pdfFiles.slice(0, 3) : [];
  const linkFiles = showPdfPreviews
    ? pdfFiles.slice(3)
    : pdfFiles;

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileTextIcon aria-hidden="true" className="text-muted-foreground size-4" />
                <CardTitle className="text-base">{doc.documentType || doc.documentNumber}</CardTitle>
              </div>
              <ChevronDownIcon
                aria-hidden="true"
                className={`text-muted-foreground size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </div>
            {doc.documentNumber && doc.documentType && (
              <div className="text-muted-foreground text-xs">{doc.documentNumber}</div>
            )}
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Financial data from XML */}
            {doc.financialData && (
              <JusticeFinancialTable data={doc.financialData} />
            )}

            {/* PDF iframe previews (only for non-XML documents) */}
            {!doc.financialData && previewFiles.length > 0 && (
              <div className="space-y-4">
                {previewFiles.map((file) => (
                  <div key={file.downloadId} className="space-y-1">
                    <div className="text-muted-foreground text-xs">{file.filename}</div>
                    <iframe
                      src={`/api/v1/justice/documents/${file.downloadId}/`}
                      className="h-[600px] w-full rounded-md border"
                      title={file.filename}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Download links for remaining files */}
            {(linkFiles.length > 0 || doc.files.some((f) => f.isXml)) && (
              <div className="space-y-1">
                <div className="text-muted-foreground text-xs font-medium">
                  {t("justice.documents.files")}
                </div>
                {doc.files
                  .filter((f) => !previewFiles.includes(f))
                  .map((file) => (
                    <a
                      key={file.downloadId}
                      href={`/api/v1/justice/documents/${file.downloadId}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1.5 text-sm"
                    >
                      <DownloadIcon aria-hidden="true" className="size-3" />
                      {file.filename}
                      {file.sizeKb != null && (
                        <span className="text-muted-foreground">({file.sizeKb} kB)</span>
                      )}
                    </a>
                  ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
```

**Step 3: Create justice-documents-section.tsx**

```typescript
"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircleIcon, FileArchiveIcon } from "lucide-react";
import { useJusticeDocuments } from "@/lib/justice";
import { JusticeDocumentCard } from "./justice-document-card";

interface JusticeDocumentsSectionProps {
  ico: string;
}

export function JusticeDocumentsSection({ ico }: JusticeDocumentsSectionProps) {
  const { t } = useTranslation("forms");
  const [enabled, setEnabled] = useState(false);
  const { data, isLoading, isError, error } = useJusticeDocuments(ico, enabled);

  if (!enabled) {
    return (
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <FileArchiveIcon aria-hidden="true" className="text-muted-foreground size-5" />
          <span className="font-medium">{t("justice.documents.title")}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEnabled(true)}>
          {t("justice.documents.load")}
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border p-4">
        <Spinner />
        <span className="text-muted-foreground text-sm">{t("justice.documents.loading")}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon aria-hidden="true" className="size-4" />
        <AlertTitle>{t("justice.documents.error")}</AlertTitle>
        <AlertDescription>
          {error?.message}
          <a
            href={`https://or.justice.cz/ias/ui/rejstrik-$firma?ico=${ico}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 underline"
          >
            {t("justice.documents.viewOnJustice")}
          </a>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || data.documents.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border p-4 text-center text-sm">
        {t("justice.documents.noDocuments")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <FileArchiveIcon aria-hidden="true" className="size-5" />
          {t("justice.documents.title")}
        </h3>
        <span className="text-muted-foreground text-sm">
          {t("justice.documents.count", { count: data.documents.length })}
        </span>
      </div>
      <div className="space-y-3">
        {data.documents.map((doc) => (
          <JusticeDocumentCard
            key={doc.documentId}
            document={doc}
            showPdfPreviews={!doc.financialData}
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 4: Add section to justice-detail.tsx**

Import and add after the existing content (after the addresses card in the right column or as a full-width section below the grid):

```typescript
import { JusticeDocumentsSection } from "./justice-documents-section";
```

Add after the closing `</div>` of the main grid layout (before the final closing tags):

```tsx
<JusticeDocumentsSection ico={ico} />
```

**Step 5: Export new components from index.ts**

Add to `src/components/justice/index.ts`.

**Step 6: Commit**

```bash
git add src/components/justice/
git commit -m "feat(justice): add sbírka listin UI with financial tables and PDF previews"
```

---

## Task 6: Localization

**Files:**
- Modify: `src/locales/cs/forms.json`
- Modify: `src/locales/en/forms.json`

**Step 1: Add Czech translations**

Add under the `justice` key:

```json
"documents": {
  "title": "Sbírka listin",
  "load": "Zobrazit sbírku listin",
  "loading": "Načítám dokumenty z or.justice.cz...",
  "error": "Nepodařilo se načíst sbírku listin",
  "viewOnJustice": "Zobrazit na or.justice.cz",
  "noDocuments": "Žádné dokumenty nenalezeny",
  "count": "{{count}} dokumentů",
  "files": "Soubory",
  "financials": {
    "item": "Položka",
    "brutto": "Brutto",
    "korekce": "Korekce",
    "netto": "Netto",
    "nettoMin": "Minulé období",
    "current": "Běžné období",
    "previous": "Minulé období",
    "period": "Období: {{from}} — {{to}}",
    "inThousands": "v tis.",
    "aktiva": "Rozvaha — Aktiva",
    "pasiva": "Rozvaha — Pasiva",
    "vzz": "Výkaz zisku a ztráty"
  }
}
```

**Step 2: Add English translations**

```json
"documents": {
  "title": "Document Collection",
  "load": "Load document collection",
  "loading": "Loading documents from or.justice.cz...",
  "error": "Failed to load document collection",
  "viewOnJustice": "View on or.justice.cz",
  "noDocuments": "No documents found",
  "count": "{{count}} documents",
  "files": "Files",
  "financials": {
    "item": "Item",
    "brutto": "Gross",
    "korekce": "Adjustment",
    "netto": "Net",
    "nettoMin": "Previous period",
    "current": "Current period",
    "previous": "Previous period",
    "period": "Period: {{from}} — {{to}}",
    "inThousands": "in thousands",
    "aktiva": "Balance Sheet — Assets",
    "pasiva": "Balance Sheet — Liabilities & Equity",
    "vzz": "Income Statement"
  }
}
```

**Step 3: Commit**

```bash
git add src/locales/
git commit -m "feat(justice): add localization for sbírka listin feature (cs + en)"
```

---

## Task 7: Build Verification

**Step 1: Run the Next.js build**

```bash
npx next build
```

Expected: Zero errors.

**Step 2: Run backend tests**

```bash
docker compose exec -T django pytest justice/ -v
```

Expected: All existing tests pass (new code doesn't break anything).

**Step 3: Manual smoke test**

```bash
# Test the documents endpoint
curl -s http://localhost:8000/api/v1/justice/entities/05113610/documents/ | python -m json.tool | head -50

# Test the PDF proxy
curl -sI http://localhost:8000/api/v1/justice/documents/e4ef9c2ffafb44729c0e72b2b1386db8/
```

**Step 4: Commit any fixes and final commit**

```bash
git add -A
git commit -m "feat(justice): sbírka listin feature complete — financial XML parsing + PDF proxy"
```
