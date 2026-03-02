"""
DRF serializers for the Justice API endpoints.
Field names use camelCase to match TypeScript entity types.
"""
from rest_framework import serializers


# --- Input serializers (request validation) ---


class EntityLookupSerializer(serializers.Serializer):
    ico = serializers.CharField(required=True, max_length=20)


class EntitySearchSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=True)
    legalForm = serializers.CharField(required=False, allow_blank=True)
    location = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=["active", "deleted", "all"], required=False, default="active"
    )
    offset = serializers.IntegerField(required=False, default=0, min_value=0)
    limit = serializers.IntegerField(
        required=False, default=20, min_value=1, max_value=100
    )


# --- Output serializers (response shape) ---


class AddressSerializer(serializers.Serializer):
    addressType = serializers.CharField(allow_blank=True)
    country = serializers.CharField(allow_blank=True)
    municipality = serializers.CharField(allow_blank=True)
    cityPart = serializers.CharField(allow_blank=True)
    street = serializers.CharField(allow_blank=True)
    houseNumber = serializers.CharField(allow_blank=True)
    orientationNumber = serializers.CharField(allow_blank=True)
    postalCode = serializers.CharField(allow_blank=True)
    district = serializers.CharField(allow_blank=True)
    fullAddress = serializers.CharField(allow_blank=True)


class PersonSerializer(serializers.Serializer):
    isNaturalPerson = serializers.BooleanField()
    firstName = serializers.CharField(allow_blank=True)
    lastName = serializers.CharField(allow_blank=True)
    birthDate = serializers.CharField(allow_null=True, required=False)
    titleBefore = serializers.CharField(allow_blank=True)
    titleAfter = serializers.CharField(allow_blank=True)
    entityName = serializers.CharField(allow_blank=True)
    entityIco = serializers.CharField(allow_blank=True)


class PersonWithFactSerializer(serializers.Serializer):
    isNaturalPerson = serializers.BooleanField()
    firstName = serializers.CharField(allow_blank=True)
    lastName = serializers.CharField(allow_blank=True)
    birthDate = serializers.CharField(allow_null=True, required=False)
    titleBefore = serializers.CharField(allow_blank=True)
    titleAfter = serializers.CharField(allow_blank=True)
    entityName = serializers.CharField(allow_blank=True)
    entityIco = serializers.CharField(allow_blank=True)
    functionName = serializers.CharField(allow_blank=True)
    functionFrom = serializers.CharField(allow_null=True, required=False)
    functionTo = serializers.CharField(allow_null=True, required=False)
    membershipFrom = serializers.CharField(allow_null=True, required=False)
    membershipTo = serializers.CharField(allow_null=True, required=False)
    registrationDate = serializers.CharField(allow_null=True, required=False)
    deletionDate = serializers.CharField(allow_null=True, required=False)


class FactSerializer(serializers.Serializer):
    header = serializers.CharField(allow_blank=True)
    factTypeCode = serializers.CharField()
    factTypeName = serializers.CharField(allow_blank=True)
    valueText = serializers.CharField(allow_blank=True)
    valueData = serializers.JSONField(allow_null=True, required=False)
    registrationDate = serializers.CharField(allow_null=True, required=False)
    deletionDate = serializers.CharField(allow_null=True, required=False)
    functionName = serializers.CharField(allow_blank=True, required=False)
    functionFrom = serializers.CharField(allow_null=True, required=False)
    functionTo = serializers.CharField(allow_null=True, required=False)
    person = PersonSerializer(allow_null=True, required=False)
    addresses = AddressSerializer(many=True, required=False)
    subFacts = serializers.ListField(required=False)


class EntitySummarySerializer(serializers.Serializer):
    ico = serializers.CharField()
    name = serializers.CharField()
    legalFormCode = serializers.CharField(allow_blank=True)
    legalFormName = serializers.CharField(allow_blank=True)
    courtName = serializers.CharField(allow_blank=True)
    fileReference = serializers.CharField(allow_blank=True)
    registrationDate = serializers.CharField(allow_null=True, required=False)
    deletionDate = serializers.CharField(allow_null=True, required=False)
    isActive = serializers.BooleanField()


class EntityDetailSerializer(serializers.Serializer):
    ico = serializers.CharField()
    name = serializers.CharField()
    legalFormCode = serializers.CharField(allow_blank=True)
    legalFormName = serializers.CharField(allow_blank=True)
    courtCode = serializers.CharField(allow_blank=True)
    courtName = serializers.CharField(allow_blank=True)
    fileSection = serializers.CharField(allow_blank=True)
    fileNumber = serializers.IntegerField(allow_null=True, required=False)
    fileReference = serializers.CharField(allow_blank=True)
    registrationDate = serializers.CharField(allow_null=True, required=False)
    deletionDate = serializers.CharField(allow_null=True, required=False)
    isActive = serializers.BooleanField()
    facts = FactSerializer(many=True)


class JusticeSearchResultSerializer(serializers.Serializer):
    totalCount = serializers.IntegerField()
    offset = serializers.IntegerField()
    limit = serializers.IntegerField()
    entities = EntitySummarySerializer(many=True)


class HistoryEntrySerializer(serializers.Serializer):
    date = serializers.CharField()
    action = serializers.CharField()
    factTypeCode = serializers.CharField()
    factTypeName = serializers.CharField(allow_blank=True)
    header = serializers.CharField(allow_blank=True)
    valueText = serializers.CharField(allow_blank=True)


class DatasetInfoSerializer(serializers.Serializer):
    datasetId = serializers.CharField()
    legalForm = serializers.CharField()
    datasetType = serializers.CharField()
    location = serializers.CharField()
    year = serializers.IntegerField()
    status = serializers.CharField()
    lastSyncedAt = serializers.CharField(allow_null=True, required=False)
    entityCount = serializers.IntegerField()


class SyncStatusSerializer(serializers.Serializer):
    totalDatasets = serializers.IntegerField()
    completedDatasets = serializers.IntegerField()
    failedDatasets = serializers.IntegerField()
    pendingDatasets = serializers.IntegerField()
    lastSyncAt = serializers.CharField(allow_null=True, required=False)
    totalEntities = serializers.IntegerField()


# --- Sbírka listin (document collection) serializers ---


class DocumentFileSerializer(serializers.Serializer):
    downloadId = serializers.CharField()
    filename = serializers.CharField()
    sizeKb = serializers.IntegerField(allow_null=True, required=False)
    pageCount = serializers.IntegerField(allow_null=True, required=False)
    isXml = serializers.BooleanField()
    isPdf = serializers.BooleanField()


class FinancialRowSerializer(serializers.Serializer):
    row = serializers.IntegerField()
    label = serializers.CharField(allow_blank=True)
    brutto = serializers.IntegerField(allow_null=True, required=False)
    korekce = serializers.IntegerField(allow_null=True, required=False)
    netto = serializers.IntegerField(allow_null=True, required=False)
    nettoMin = serializers.IntegerField(allow_null=True, required=False)
    current = serializers.IntegerField(allow_null=True, required=False)
    previous = serializers.IntegerField(allow_null=True, required=False)


class FinancialMetadataSerializer(serializers.Serializer):
    periodFrom = serializers.CharField()
    periodTo = serializers.CharField()
    currency = serializers.CharField()
    unit = serializers.CharField()
    rozsahRozvaha = serializers.CharField(allow_blank=True)
    rozsahVzz = serializers.CharField(allow_blank=True)


class FinancialDataSerializer(serializers.Serializer):
    metadata = FinancialMetadataSerializer()
    aktiva = FinancialRowSerializer(many=True)
    pasiva = FinancialRowSerializer(many=True)
    vzz = FinancialRowSerializer(many=True)


class DocumentSerializer(serializers.Serializer):
    documentId = serializers.CharField()
    subjektId = serializers.CharField()
    spisId = serializers.CharField()
    documentNumber = serializers.CharField(allow_blank=True)
    documentType = serializers.CharField(allow_blank=True)
    files = DocumentFileSerializer(many=True)
    financialData = FinancialDataSerializer(allow_null=True, required=False)


class DocumentListSerializer(serializers.Serializer):
    subjektId = serializers.CharField()
    documents = DocumentSerializer(many=True)
