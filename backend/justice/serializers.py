"""
DRF serializers for the Justice API endpoints.
"""
from rest_framework import serializers


# --- Input serializers (request validation) ---


class JusticeDocumentRequestSerializer(serializers.Serializer):
    ico = serializers.CharField(required=True)
    document_id = serializers.CharField(required=True)


class JusticeSearchRequestSerializer(serializers.Serializer):
    dataset_url = serializers.URLField(required=True)


# --- Output serializers (response shape) ---


class JusticeDocumentResponseSerializer(serializers.Serializer):
    ico = serializers.CharField()
    documentId = serializers.CharField()
    documentType = serializers.CharField()
    textContent = serializers.CharField()
    tables = serializers.ListField()
    tableCount = serializers.IntegerField()
    sourceUrl = serializers.CharField()


class JusticeCompanyRecordSerializer(serializers.Serializer):
    ico = serializers.CharField()
    name = serializers.CharField()
    legal_form = serializers.CharField(allow_blank=True)
    address = serializers.CharField(allow_blank=True)
    registry_court = serializers.CharField(allow_blank=True)
    file_number = serializers.CharField(allow_blank=True)
    registration_date = serializers.CharField(allow_blank=True)
