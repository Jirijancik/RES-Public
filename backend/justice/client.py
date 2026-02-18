"""
HTTP client for downloading data from Czech Justice Registry.
Two sources:
  1. dataor.justice.cz -- open data CSV/XML exports (structured)
  2. or.justice.cz -- PDF documents (Sbirka listin / document collection)
"""
import requests
from core.exceptions import ExternalAPIError
from .constants import JUSTICE_BASE_URL, REQUEST_TIMEOUT


class JusticeClient:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "GTDN-Backend/1.0"})

    def download_csv(self, dataset_url: str) -> bytes:
        """Download a CSV dataset from the open data portal."""
        try:
            resp = self.session.get(dataset_url, timeout=REQUEST_TIMEOUT, stream=True)
            resp.raise_for_status()
            return resp.content
        except requests.RequestException:
            raise ExternalAPIError(
                "Justice open data unavailable", service_name="justice"
            )

    def download_document(self, document_id: str) -> tuple[bytes, str]:
        """Download a PDF from the Sbirka listin. Returns (bytes, source_url)."""
        url = f"{JUSTICE_BASE_URL}/ias/content/download?id={document_id}"
        try:
            resp = self.session.get(url, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "")
            if "pdf" not in content_type.lower():
                raise ExternalAPIError(
                    f"Expected PDF, got: {content_type}", service_name="justice"
                )
            return resp.content, url
        except requests.RequestException:
            raise ExternalAPIError(
                "Justice document download failed", service_name="justice"
            )
