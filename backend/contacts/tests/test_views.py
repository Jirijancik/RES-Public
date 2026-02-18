from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from contacts.models import ContactSubmission, NewsletterSubscriber

CONTACT_URL = "/api/v1/contacts/contact-form/"
NEWSLETTER_URL = "/api/v1/contacts/newsletter/"

VALID_CONTACT_DATA = {
    "name": "John",
    "surname": "Doe",
    "email": "john@example.com",
    "phone": "+420123456789",
    "message": "Hello, this is a test message for the contact form.",
    "gdprConsent": True,
    "turnstileToken": "valid-token",
}

VALID_NEWSLETTER_DATA = {
    "email": "subscriber@example.com",
    "turnstileToken": "valid-token",
}


def _mock_turnstile_success(token, remoteip=None):
    return {"success": True, "error": None}


def _mock_turnstile_failure(token, remoteip=None):
    return {"success": False, "error": "Verification failed."}


@override_settings(FORM_RECIPIENT_EMAIL="recipient@test.com")
class ContactFormViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()

    @patch("core.mixins.verify_turnstile_token", _mock_turnstile_success)
    @patch("contacts.services.send_mail")
    def test_successful_submission(self, mock_send_mail):
        response = self.client.post(CONTACT_URL, VALID_CONTACT_DATA, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Message sent successfully!")
        self.assertEqual(ContactSubmission.objects.count(), 1)
        submission = ContactSubmission.objects.first()
        self.assertEqual(submission.name, "John")
        self.assertEqual(submission.surname, "Doe")
        self.assertTrue(mock_send_mail.called)

    @patch("core.mixins.verify_turnstile_token", _mock_turnstile_success)
    def test_validation_missing_fields(self):
        response = self.client.post(CONTACT_URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ContactSubmission.objects.count(), 0)

    @patch("core.mixins.verify_turnstile_token", _mock_turnstile_success)
    def test_validation_name_too_short(self):
        data = {**VALID_CONTACT_DATA, "name": "J"}
        response = self.client.post(CONTACT_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("core.mixins.verify_turnstile_token", _mock_turnstile_success)
    def test_validation_invalid_phone(self):
        data = {**VALID_CONTACT_DATA, "phone": "abc"}
        response = self.client.post(CONTACT_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("core.mixins.verify_turnstile_token", _mock_turnstile_success)
    def test_validation_gdpr_false(self):
        data = {**VALID_CONTACT_DATA, "gdprConsent": False}
        response = self.client.post(CONTACT_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("core.mixins.verify_turnstile_token", _mock_turnstile_success)
    def test_validation_message_too_short(self):
        data = {**VALID_CONTACT_DATA, "message": "Short"}
        response = self.client.post(CONTACT_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("core.mixins.verify_turnstile_token", _mock_turnstile_failure)
    def test_turnstile_failure(self):
        response = self.client.post(CONTACT_URL, VALID_CONTACT_DATA, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ContactSubmission.objects.count(), 0)

    def test_missing_turnstile_token(self):
        data = {k: v for k, v in VALID_CONTACT_DATA.items() if k != "turnstileToken"}
        response = self.client.post(CONTACT_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("core.mixins.verify_turnstile_token", _mock_turnstile_success)
    @patch("contacts.services.send_mail", side_effect=Exception("SMTP error"))
    def test_email_failure_returns_500(self, mock_send_mail):
        response = self.client.post(CONTACT_URL, VALID_CONTACT_DATA, format="json")
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("error", response.data)
        # Submission is still saved to DB even though email failed
        self.assertEqual(ContactSubmission.objects.count(), 1)


@override_settings(FORM_RECIPIENT_EMAIL="recipient@test.com")
class NewsletterViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()

    @patch("core.mixins.verify_turnstile_token", _mock_turnstile_success)
    @patch("contacts.services.send_mail")
    def test_successful_subscription(self, mock_send_mail):
        response = self.client.post(NEWSLETTER_URL, VALID_NEWSLETTER_DATA, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Successfully subscribed to newsletter!")
        self.assertEqual(NewsletterSubscriber.objects.count(), 1)
        self.assertTrue(mock_send_mail.called)

    @patch("core.mixins.verify_turnstile_token", _mock_turnstile_success)
    @patch("contacts.services.send_mail")
    def test_duplicate_email_upsert(self, mock_send_mail):
        NewsletterSubscriber.objects.create(email="subscriber@example.com", is_active=False)
        response = self.client.post(NEWSLETTER_URL, VALID_NEWSLETTER_DATA, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(NewsletterSubscriber.objects.count(), 1)
        subscriber = NewsletterSubscriber.objects.first()
        self.assertTrue(subscriber.is_active)

    @patch("core.mixins.verify_turnstile_token", _mock_turnstile_success)
    def test_invalid_email(self):
        data = {"email": "not-an-email", "turnstileToken": "valid-token"}
        response = self.client.post(NEWSLETTER_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("core.mixins.verify_turnstile_token", _mock_turnstile_failure)
    def test_turnstile_failure(self):
        response = self.client.post(NEWSLETTER_URL, VALID_NEWSLETTER_DATA, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(NewsletterSubscriber.objects.count(), 0)

    def test_missing_turnstile_token(self):
        data = {"email": "subscriber@example.com"}
        response = self.client.post(NEWSLETTER_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("core.mixins.verify_turnstile_token", _mock_turnstile_success)
    @patch("contacts.services.send_mail", side_effect=Exception("SMTP error"))
    def test_email_failure_returns_500(self, mock_send_mail):
        response = self.client.post(NEWSLETTER_URL, VALID_NEWSLETTER_DATA, format="json")
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("error", response.data)
