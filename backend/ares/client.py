"""
HTTP client for the ARES government API.
Uses requests.Session() for HTTP connection pooling.
"""
import requests

from core.exceptions import ExternalAPIError
from .constants import ARES_BASE_URL, ARES_REQUEST_TIMEOUT


class AresClient:
    def __init__(self):
        self.base_url = ARES_BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json",
        })

    def search(self, request_body: dict) -> dict:
        """POST /vyhledat — raw dict in Czech API format."""
        try:
            resp = self.session.post(
                f"{self.base_url}/vyhledat",
                json=request_body,
                timeout=ARES_REQUEST_TIMEOUT,
            )
            resp.raise_for_status()
            return resp.json()
        except requests.HTTPError as e:
            raise self._map_error(e)
        except requests.RequestException:
            raise ExternalAPIError(
                "Unable to connect to ARES service", service_name="ares"
            )

    def get_by_ico(self, ico: str) -> dict:
        """GET /{ico} — returns raw dict in Czech API format."""
        try:
            resp = self.session.get(
                f"{self.base_url}/{ico}",
                timeout=ARES_REQUEST_TIMEOUT,
            )
            resp.raise_for_status()
            return resp.json()
        except requests.HTTPError as e:
            raise self._map_error(e)
        except requests.RequestException:
            raise ExternalAPIError(
                "Unable to connect to ARES service", service_name="ares"
            )

    def _map_error(self, error: requests.HTTPError) -> ExternalAPIError:
        code = error.response.status_code if error.response is not None else None
        messages = {
            400: "Invalid request parameters",
            404: "Economic subject not found",
            429: "Too many requests. Please try again later.",
        }
        return ExternalAPIError(
            messages.get(code, "ARES service is temporarily unavailable"),
            status_code=code,
            service_name="ares",
        )


# Module-level singleton for connection pooling.
ares_client = AresClient()
