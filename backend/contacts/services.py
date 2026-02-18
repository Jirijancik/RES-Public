import logging
from datetime import datetime, timezone

from django.conf import settings
from django.core.mail import send_mail

from contacts.models import ContactSubmission, NewsletterSubscriber

logger = logging.getLogger(__name__)


def _format_email_timestamp():
    """Replicate formatEmailTimestamp() from src/lib/utils.ts:
    new Date().toISOString().slice(0, 16).replace('T', ' ')
    Produces: '2026-02-18 14:30'
    """
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")


class ContactService:
    def submit(self, data: dict, client_ip: str | None = None):
        """Save contact submission to DB and send notification email."""
        submission = ContactSubmission.objects.create(
            name=data["name"],
            surname=data["surname"],
            email=data["email"],
            phone=data["phone"],
            message=data["message"],
            gdpr_consent=data["gdprConsent"],
            client_ip=client_ip,
        )

        timestamp = _format_email_timestamp()
        name = data["name"]
        surname = data["surname"]
        email = data["email"]
        phone = data["phone"]
        message = data["message"]

        subject = f"New contact form message from {name} {surname}"

        html_message = (
            f"<h2>New contact form message</h2>"
            f"<p><strong>Name:</strong> {name}</p>"
            f"<p><strong>Surname:</strong> {surname}</p>"
            f"<p><strong>Email:</strong> {email}</p>"
            f"<p><strong>Phone:</strong> {phone}</p>"
            f"<p><strong>Message:</strong></p>"
            f'<p>{message.replace(chr(10), "<br>")}</p>'
            f"<p><em>Sent: {timestamp}</em></p>"
        )

        text_message = (
            f"New contact form message\n\n"
            f"Name: {name}\n"
            f"Surname: {surname}\n"
            f"Email: {email}\n"
            f"Phone: {phone}\n"
            f"Message: {message}\n\n"
            f"Sent: {timestamp}"
        )

        try:
            send_mail(
                subject=subject,
                message=text_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[settings.FORM_RECIPIENT_EMAIL],
                html_message=html_message,
                fail_silently=False,
            )
        except Exception:
            logger.exception(
                "Failed to send contact form email for submission %s",
                submission.pk,
            )
            raise

        return submission


class NewsletterService:
    def subscribe(self, email: str):
        """Upsert newsletter subscriber and send notification email."""
        subscriber, created = NewsletterSubscriber.objects.update_or_create(
            email=email,
            defaults={"is_active": True},
        )

        timestamp = _format_email_timestamp()

        subject = f"New newsletter subscription - {email}"

        html_message = (
            f"<h2>New newsletter subscription</h2>"
            f"<p><strong>Email:</strong> {email}</p>"
            f"<p><em>Subscribed: {timestamp}</em></p>"
        )

        text_message = (
            f"New newsletter subscription\n\n"
            f"Email: {email}\n\n"
            f"Subscribed: {timestamp}"
        )

        try:
            send_mail(
                subject=subject,
                message=text_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[settings.FORM_RECIPIENT_EMAIL],
                html_message=html_message,
                fail_silently=False,
            )
        except Exception:
            logger.exception(
                "Failed to send newsletter notification email for %s", email
            )
            raise

        return subscriber
