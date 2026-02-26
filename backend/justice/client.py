"""
HTTP clients for the Czech Justice Registry.

JusticeCKANClient: CKAN Open Data API at dataor.justice.cz (datasets, file downloads).
JusticePDFClient:  PDF document downloads from or.justice.cz (Sbirka listin).
"""
import logging
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


# Module-level singletons for connection pooling.
justice_ckan_client = JusticeCKANClient()
justice_pdf_client = JusticePDFClient()
