"""
DRF serializers defining the API contract.
Field names use camelCase to match the TypeScript entity types exactly.
"""
from rest_framework import serializers


# --- Input serializers (request validation) ---


class SearchLocationSerializer(serializers.Serializer):
    municipalityCode = serializers.IntegerField(required=False)
    regionCode = serializers.IntegerField(required=False)
    districtCode = serializers.IntegerField(required=False)


class SearchRequestSerializer(serializers.Serializer):
    start = serializers.IntegerField(required=False, min_value=0)
    count = serializers.IntegerField(required=False, min_value=1, max_value=100)
    sorting = serializers.ListField(
        child=serializers.CharField(), required=False
    )
    ico = serializers.ListField(
        child=serializers.CharField(), required=False
    )
    businessName = serializers.CharField(required=False, allow_blank=True)
    legalForm = serializers.ListField(
        child=serializers.CharField(), required=False
    )
    location = SearchLocationSerializer(required=False)


# --- Output serializers (response shape) ---


class HeadquartersSerializer(serializers.Serializer):
    countryCode = serializers.CharField(allow_null=True, required=False)
    countryName = serializers.CharField(allow_null=True, required=False)
    regionCode = serializers.IntegerField(allow_null=True, required=False)
    regionName = serializers.CharField(allow_null=True, required=False)
    districtCode = serializers.IntegerField(allow_null=True, required=False)
    districtName = serializers.CharField(allow_null=True, required=False)
    municipalityCode = serializers.IntegerField(allow_null=True, required=False)
    municipalityName = serializers.CharField(allow_null=True, required=False)
    administrativeDistrictCode = serializers.IntegerField(
        allow_null=True, required=False
    )
    administrativeDistrictName = serializers.CharField(
        allow_null=True, required=False
    )
    cityDistrictCode = serializers.IntegerField(allow_null=True, required=False)
    cityDistrictName = serializers.CharField(allow_null=True, required=False)
    cityPartCode = serializers.IntegerField(allow_null=True, required=False)
    cityPartName = serializers.CharField(allow_null=True, required=False)
    streetCode = serializers.IntegerField(allow_null=True, required=False)
    streetName = serializers.CharField(allow_null=True, required=False)
    buildingNumber = serializers.IntegerField(allow_null=True, required=False)
    addressSupplement = serializers.CharField(allow_null=True, required=False)
    municipalityPartCode = serializers.IntegerField(
        allow_null=True, required=False
    )
    orientationNumber = serializers.IntegerField(
        allow_null=True, required=False
    )
    orientationNumberLetter = serializers.CharField(
        allow_null=True, required=False
    )
    municipalityPartName = serializers.CharField(
        allow_null=True, required=False
    )
    addressPointCode = serializers.IntegerField(
        allow_null=True, required=False
    )
    postalCode = serializers.IntegerField(allow_null=True, required=False)
    textAddress = serializers.CharField(allow_null=True, required=False)
    addressNumberTo = serializers.CharField(allow_null=True, required=False)
    addressStandardized = serializers.BooleanField(
        allow_null=True, required=False
    )
    postalCodeText = serializers.CharField(allow_null=True, required=False)
    buildingNumberType = serializers.IntegerField(
        allow_null=True, required=False
    )


class DeliveryAddressSerializer(serializers.Serializer):
    addressLine1 = serializers.CharField(allow_null=True, required=False)
    addressLine2 = serializers.CharField(allow_null=True, required=False)
    addressLine3 = serializers.CharField(allow_null=True, required=False)


class RegistrationStatusesSerializer(serializers.Serializer):
    rosStatus = serializers.CharField(allow_null=True, required=False)
    businessRegisterStatus = serializers.CharField(
        allow_null=True, required=False
    )
    resStatus = serializers.CharField(allow_null=True, required=False)
    tradeRegisterStatus = serializers.CharField(
        allow_null=True, required=False
    )
    nrpzsStatus = serializers.CharField(allow_null=True, required=False)
    rpshStatus = serializers.CharField(allow_null=True, required=False)
    rcnsStatus = serializers.CharField(allow_null=True, required=False)
    szrStatus = serializers.CharField(allow_null=True, required=False)
    vatStatus = serializers.CharField(allow_null=True, required=False)
    slovakVatStatus = serializers.CharField(allow_null=True, required=False)
    sdStatus = serializers.CharField(allow_null=True, required=False)
    irStatus = serializers.CharField(allow_null=True, required=False)
    ceuStatus = serializers.CharField(allow_null=True, required=False)
    rsStatus = serializers.CharField(allow_null=True, required=False)
    redStatus = serializers.CharField(allow_null=True, required=False)
    monitorStatus = serializers.CharField(allow_null=True, required=False)


class BusinessRecordSerializer(serializers.Serializer):
    ico = serializers.CharField()
    businessName = serializers.CharField()
    headquarters = HeadquartersSerializer(allow_null=True, required=False)
    legalForm = serializers.CharField(allow_null=True, required=False)
    legalFormRos = serializers.CharField(allow_null=True, required=False)
    taxOffice = serializers.CharField(allow_null=True, required=False)
    foundationDate = serializers.CharField(allow_null=True, required=False)
    terminationDate = serializers.CharField(allow_null=True, required=False)
    updateDate = serializers.CharField(allow_null=True, required=False)
    vatId = serializers.CharField(allow_null=True, required=False)
    slovakVatId = serializers.CharField(allow_null=True, required=False)
    naceActivities = serializers.ListField(
        child=serializers.CharField(), required=False, allow_null=True
    )
    naceActivities2008 = serializers.ListField(
        child=serializers.CharField(), required=False, allow_null=True
    )
    deliveryAddress = DeliveryAddressSerializer(
        allow_null=True, required=False
    )
    registrationStatuses = RegistrationStatusesSerializer(
        allow_null=True, required=False
    )
    primarySource = serializers.CharField(allow_null=True, required=False)
    subRegisterSzr = serializers.CharField(allow_null=True, required=False)
    isPrimaryRecord = serializers.BooleanField(required=False)


class EconomicSubjectSerializer(serializers.Serializer):
    icoId = serializers.CharField()
    records = BusinessRecordSerializer(many=True)


class SearchResultSerializer(serializers.Serializer):
    totalCount = serializers.IntegerField()
    economicSubjects = EconomicSubjectSerializer(many=True)
