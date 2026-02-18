import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.mixins import TurnstileVerificationMixin
from core.throttles import ContactFormThrottle

from contacts.serializers import ContactFormSerializer, NewsletterSerializer
from contacts.services import ContactService, NewsletterService

logger = logging.getLogger(__name__)


class ContactFormView(TurnstileVerificationMixin, APIView):
    throttle_classes = [ContactFormThrottle]

    def _get_client_ip(self, request):
        return (
            request.META.get("HTTP_CF_CONNECTING_IP")
            or request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
            or request.META.get("HTTP_X_REAL_IP")
            or request.META.get("REMOTE_ADDR")
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
