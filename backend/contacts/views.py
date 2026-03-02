import logging

from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.mixins import TurnstileVerificationMixin
from core.throttles import ContactFormThrottle

from contacts.serializers import ContactFormSerializer, NewsletterSerializer
from contacts.services import ContactService, NewsletterService

logger = logging.getLogger(__name__)

# Reusable response schemas for documentation
_success_response = inline_serializer("SuccessMessage", {"message": serializers.CharField()})
_error_response = inline_serializer("ErrorMessage", {"error": serializers.CharField()})


class ContactFormView(TurnstileVerificationMixin, APIView):
    throttle_classes = [ContactFormThrottle]

    def _get_client_ip(self, request):
        return (
            request.META.get("HTTP_CF_CONNECTING_IP")
            or request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
            or request.META.get("HTTP_X_REAL_IP")
            or request.META.get("REMOTE_ADDR")
        )

    @extend_schema(
        tags=["Contacts"],
        summary="Submit contact form",
        description=(
            "Submit a contact form message. Protected by Cloudflare Turnstile CAPTCHA "
            "and rate-limited to 5 submissions per hour per IP. "
            "Requires a valid `turnstileToken` field in the request body."
        ),
        request=ContactFormSerializer,
        responses={
            200: _success_response,
            429: _error_response,
            500: _error_response,
        },
    )
    def post(self, request):
        self.verify_turnstile(request)
        serializer = ContactFormSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            service = ContactService()
            service.submit(
                serializer.validated_data,
                client_ip=self._get_client_ip(request),
            )
        except Exception:
            return Response(
                {"error": "An error occurred while sending the message. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response({"message": "Message sent successfully!"})


class NewsletterView(TurnstileVerificationMixin, APIView):
    @extend_schema(
        tags=["Contacts"],
        summary="Subscribe to newsletter",
        description=(
            "Subscribe an email address to the newsletter. "
            "Protected by Cloudflare Turnstile CAPTCHA. "
            "Requires a valid `turnstileToken` field in the request body."
        ),
        request=NewsletterSerializer,
        responses={
            200: _success_response,
            500: _error_response,
        },
    )
    def post(self, request):
        self.verify_turnstile(request)
        serializer = NewsletterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            service = NewsletterService()
            service.subscribe(serializer.validated_data["email"])
        except Exception:
            return Response(
                {"error": "An error occurred during subscription. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response({"message": "Successfully subscribed to newsletter!"})
