"""DRF serializers for Company API. camelCase to match frontend."""
from rest_framework import serializers


class CompanySourcesSerializer(serializers.Serializer):
    justice = serializers.DictField(allow_null=True)
    ares = serializers.DictField(allow_null=True)


class CompanyDetailSerializer(serializers.Serializer):
    ico = serializers.CharField()
    name = serializers.CharField()
    isActive = serializers.BooleanField()
    sources = CompanySourcesSerializer()
    createdAt = serializers.CharField()
    updatedAt = serializers.CharField()


class CompanySearchRequestSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=True)
    legalForm = serializers.CharField(required=False)
    regionCode = serializers.IntegerField(required=False)
    employeeCategory = serializers.CharField(required=False)
    revenueMin = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    revenueMax = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    nace = serializers.CharField(required=False)
    status = serializers.ChoiceField(choices=["active", "inactive", "all"], required=False)
    offset = serializers.IntegerField(required=False, min_value=0)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=100)


class CompanySummarySerializer(serializers.Serializer):
    ico = serializers.CharField()
    name = serializers.CharField()
    isActive = serializers.BooleanField()
    legalForm = serializers.CharField()
    regionCode = serializers.IntegerField(allow_null=True)
    regionName = serializers.CharField()
    employeeCategory = serializers.CharField()
    latestRevenue = serializers.CharField(allow_null=True)
    nacePrimary = serializers.CharField()


class CompanySearchResultSerializer(serializers.Serializer):
    totalCount = serializers.IntegerField()
    offset = serializers.IntegerField()
    limit = serializers.IntegerField()
    companies = CompanySummarySerializer(many=True)
