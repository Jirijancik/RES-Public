"""
HTTP clients for the Czech Justice Registry.

JusticeCKANClient:    CKAN Open Data API at dataor.justice.cz (datasets, file downloads).
JusticePDFClient:     PDF document downloads from or.justice.cz (Sbirka listin).
JusticeSbirkaClient:  HTML scraping of or.justice.cz for Sbírka listin documents.
"""
import html as html_module
import logging
import re
from typing import Iterator

import requests

from django.conf import settings

from core.exceptions import ExternalAPIError
from .constants import (
    DOWNLOAD_CHUNK_SIZE,
    FILE_DOWNLOAD_TIMEOUT,
    JUSTICE_BASE_URL,
    JUSTICE_CKAN_API_URL,
    JUSTICE_FILE_API_URL,
    REQUEST_TIMEOUT,
    SBIRKA_REQUEST_TIMEOUT,
)

logger = logging.getLogger(__name__)

# Czech government sites (dataor.justice.cz) often have certificate chains
# not trusted by the standard Mozilla CA bundle. Allow disabling SSL
# verification via Django settings for development.
_VERIFY_SSL = getattr(settings, "JUSTICE_VERIFY_SSL", True)


class JusticeCKANClient:
    """HTTP client for the CKAN Open Data API at dataor.justice.cz."""

    def __init__(self):
        self.session = requests.Session()
        self.session.verify = _VERIFY_SSL
        self.session.headers.update({
            "User-Agent": "GTDN-Backend/1.0",
            "Accept": "application/json",
        })

    def list_datasets(self) -> list[str]:
        """GET /api/3/action/package_list → list of all dataset IDs."""
        try:
            resp = self.session.get(
                f"{JUSTICE_CKAN_API_URL}/package_list",
                timeout=REQUEST_TIMEOUT,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("result", [])
        except requests.HTTPError as e:
            raise self._map_error(e)
        except requests.RequestException:
            raise ExternalAPIError(
                "Justice open data API unavailable",
                service_name="justice",
            )

    def get_dataset(self, dataset_id: str) -> dict:
        """GET /api/3/action/package_show?id={id} → full dataset metadata."""
        try:
            resp = self.session.get(
                f"{JUSTICE_CKAN_API_URL}/package_show",
                params={"id": dataset_id},
                timeout=REQUEST_TIMEOUT,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("result", {})
        except requests.HTTPError as e:
            raise self._map_error(e)
        except requests.RequestException:
            raise ExternalAPIError(
                "Justice open data API unavailable",
                service_name="justice",
            )

    def get_file_size(self, filename: str) -> int | None:
        """HEAD request to get Content-Length for change detection."""
        try:
            resp = self.session.head(
                f"{JUSTICE_FILE_API_URL}/{filename}",
                timeout=REQUEST_TIMEOUT,
            )
            resp.raise_for_status()
            length = resp.headers.get("Content-Length")
            return int(length) if length else None
        except (requests.RequestException, ValueError):
            return None

    def download_file_stream(self, filename: str) -> Iterator[bytes]:
        """GET /api/file/{filename} → streaming byte iterator for .xml.gz files."""
        try:
            resp = self.session.get(
                f"{JUSTICE_FILE_API_URL}/{filename}",
                timeout=FILE_DOWNLOAD_TIMEOUT,
                stream=True,
            )
            resp.raise_for_status()
            return resp.iter_content(chunk_size=DOWNLOAD_CHUNK_SIZE)
        except requests.HTTPError as e:
            raise self._map_error(e)
        except requests.RequestException:
            raise ExternalAPIError(
                "Justice file download failed",
                service_name="justice",
            )

    def _map_error(self, error: requests.HTTPError) -> ExternalAPIError:
        code = error.response.status_code if error.response is not None else None
        messages = {
            400: "Invalid request parameters",
            404: "Dataset not found",
            429: "Too many requests. Please try again later.",
        }
        return ExternalAPIError(
            messages.get(code, "Justice open data service is temporarily unavailable"),
            status_code=code,
            service_name="justice",
        )


class JusticePDFClient:
    """HTTP client for PDF downloads from or.justice.cz (Sbirka listin)."""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "GTDN-Backend/1.0"})

    def download_document(self, document_id: str) -> tuple[bytes, str]:
        """Download a PDF from the Sbirka listin. Returns (bytes, source_url)."""
        url = f"{JUSTICE_BASE_URL}/ias/content/download?id={document_id}"
        try:
            resp = self.session.get(url, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "")
            if "pdf" not in content_type.lower():
                raise ExternalAPIError(
                    f"Expected PDF, got: {content_type}",
                    service_name="justice",
                )
            return resp.content, url
        except requests.RequestException:
            raise ExternalAPIError(
                "Justice document download failed",
                service_name="justice",
            )


# ---------------------------------------------------------------------------
# JusticeSbirkaClient — HTML scraping for Sbírka listin
# ---------------------------------------------------------------------------


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
        except requests.RequestException:
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
        detail_pattern = re.compile(
            r'vypis-sl-detail\?dokument=(\d+)&amp;subjektId=\d+&amp;spis=(\d+)'
        )
        type_pattern = re.compile(r'class="symbol">([^<]+)</span>')
        number_pattern = re.compile(
            r'vypis-sl-detail[^>]*><span>([^<]+)</span>'
        )

        detail_matches = list(detail_pattern.finditer(html))
        type_matches = list(type_pattern.finditer(html))
        number_matches = list(number_pattern.finditer(html))

        for i, detail_match in enumerate(detail_matches):
            doc_id = detail_match.group(1)
            spis_id = detail_match.group(2)

            doc_types = []
            if i < len(type_matches):
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
                doc_number = html_module.unescape(raw).replace("\xa0", " ").strip()

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
        link_pattern = re.compile(
            r'download\?id=([a-f0-9-]+)"[^>]*>\s*(?:<[^>]+>)?\s*([^<]+)'
        )
        for match in link_pattern.finditer(html):
            download_id = match.group(1)
            filename = match.group(2).strip()

            if "GDPR" in filename or "Informace" in filename:
                continue

            is_xml = filename.lower().endswith(".xml")
            is_pdf = filename.lower().endswith(".pdf")

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


# Module-level singletons for connection pooling.
justice_ckan_client = JusticeCKANClient()
justice_pdf_client = JusticePDFClient()
justice_sbirka_client = JusticeSbirkaClient()
