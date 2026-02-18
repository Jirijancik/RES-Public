"""
Cloudflare Turnstile verification — ported from src/lib/turnstile.ts.
"""

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

VERIFY_ENDPOINT_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
VERIFICATION_TIMEOUT = 10  # seconds

ERROR_MESSAGES = {
    "timeout-or-duplicate": "Verification expired or already used. Please try again.",
    "invalid-input-response": "Invalid verification. Please refresh and try again.",
    "invalid-input-secret": "Server configuration error. Please contact support.",
    "missing-input-response": "Missing verification. Please complete the challenge.",
    "missing-input-secret": "Server configuration error. Please contact support.",
    "bad-request": "Invalid request. Please try again.",
    "internal-error": "Verification service temporarily unavailable. Please try again.",
}


def _get_error_message(error_codes: list[str]) -> str:
    for code in error_codes:
        if code in ERROR_MESSAGES:
            return ERROR_MESSAGES[code]
    return "Verification failed. Please try again."


def verify_turnstile_token(
    token: str, remoteip: str | None = None
) -> dict[str, bool | str | None]:
    """
    Verify a Turnstile token with Cloudflare.

    Returns: {"success": bool, "error": str | None}
    """
    secret = settings.TURNSTILE_SECRET_KEY

    if not secret:
        return {
            "success": False,
            "error": "Server configuration error - missing Turnstile secret key.",
        }

    if not token:
        return {
            "success": False,
            "error": "Missing Turnstile verification.",
        }

    # Validate token length (max 2048 characters per Cloudflare docs)
    if len(token) > 2048:
        return {
            "success": False,
            "error": "Invalid token format.",
        }

    data = {"secret": secret, "response": token}
    if remoteip:
        data["remoteip"] = remoteip

    try:
        response = requests.post(
            VERIFY_ENDPOINT_URL,
            data=data,  # requests sends as application/x-www-form-urlencoded
            timeout=VERIFICATION_TIMEOUT,
        )
        result = response.json()

        if not result.get("success"):
            error_codes = result.get("error-codes", [])
            logger.error(
                "Turnstile verification failed: %s (hostname: %s)",
                error_codes,
                result.get("hostname"),
            )
            return {
                "success": False,
                "error": _get_error_message(error_codes),
            }

        return {"success": True, "error": None}

    except requests.Timeout:
        logger.error("Turnstile verification timeout")
        return {
            "success": False,
            "error": "Verification timeout. Please try again.",
        }
    except Exception:
        logger.exception("Turnstile verification error")
        return {
            "success": False,
            "error": "An error occurred during verification. Please try again.",
        }
