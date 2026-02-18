import re

from rest_framework import serializers


class ContactFormSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=50)
    surname = serializers.CharField(min_length=2, max_length=50)
    email = serializers.EmailField()
    phone = serializers.CharField(min_length=9, max_length=20)
    message = serializers.CharField(min_length=10, max_length=1000)
    gdprConsent = serializers.BooleanField()

    def validate_phone(self, value):
        if not re.match(r"^[+]?[0-9\s\-()]+$", value):
            raise serializers.ValidationError(
                "Please enter a valid phone number."
            )
        return value

    def validate_gdprConsent(self, value):
        if not value:
            raise serializers.ValidationError(
                "You must agree to the processing of personal data."
            )
        return value


class NewsletterSerializer(serializers.Serializer):
    email = serializers.EmailField()
