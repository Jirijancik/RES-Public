from rest_framework.exceptions import ValidationError

from core.services.turnstile import verify_turnstile_token


class TurnstileVerificationMixin:
    def verify_turnstile(self, request):
        token = request.data.get("turnstileToken")
        if not token:
            raise ValidationError(
                {"turnstileToken": "Turnstile verification is required."}
            )

        client_ip = (
            request.META.get("HTTP_CF_CONNECTING_IP")
            or request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
            or request.META.get("HTTP_X_REAL_IP")
            or request.META.get("REMOTE_ADDR")
        )

        result = verify_turnstile_token(token, client_ip)
        if not result["success"]:
            raise ValidationError(
                {"turnstileToken": result.get("error", "Verification failed.")}
            )
