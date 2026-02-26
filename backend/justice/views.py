"""
Justice API endpoints. Thin handlers: validate → service → serialize → respond.
"""
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    AddressSerializer,
    DatasetInfoSerializer,
    EntityDetailSerializer,
    EntityLookupSerializer,
    EntitySearchSerializer,
    HistoryEntrySerializer,
    PersonWithFactSerializer,
    SearchResultSerializer,
    SyncStatusSerializer,
)
from .services import JusticeService


class EntityLookupView(APIView):
    """GET /v1/justice/entities/?ico={ico}"""

    def get(self, request):
        serializer = EntityLookupSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        service = JusticeService()
        result = service.get_entity_by_ico(serializer.validated_data["ico"])

        return Response(EntityDetailSerializer(result).data)


class EntitySearchView(APIView):
    """GET /v1/justice/entities/search/?name=&legalForm=&location=&status="""

    def get(self, request):
        serializer = EntitySearchSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        service = JusticeService()
        result = service.search_entities(serializer.validated_data)

        return Response(SearchResultSerializer(result).data)


class EntityHistoryView(APIView):
    """GET /v1/justice/entities/{ico}/history/"""

    def get(self, request, ico):
        service = JusticeService()
        result = service.get_entity_history(ico)

        return Response(HistoryEntrySerializer(result, many=True).data)


class EntityPersonsView(APIView):
    """GET /v1/justice/entities/{ico}/persons/"""

    def get(self, request, ico):
        service = JusticeService()
        result = service.get_entity_persons(ico)

        return Response(PersonWithFactSerializer(result, many=True).data)


class EntityAddressesView(APIView):
    """GET /v1/justice/entities/{ico}/addresses/"""

    def get(self, request, ico):
        service = JusticeService()
        result = service.get_entity_addresses(ico)

        return Response(AddressSerializer(result, many=True).data)


class DatasetListView(APIView):
    """GET /v1/justice/datasets/"""

    def get(self, request):
        service = JusticeService()
        result = service.list_datasets()

        return Response(DatasetInfoSerializer(result, many=True).data)


class SyncStatusView(APIView):
    """GET /v1/justice/sync/status/"""

    def get(self, request):
        service = JusticeService()
        result = service.get_sync_status()

        return Response(SyncStatusSerializer(result).data)
