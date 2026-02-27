"""
Justice API endpoints. Thin handlers: validate → service → serialize → respond.
"""
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from rest_framework.response import Response
from rest_framework.views import APIView

from .client import justice_sbirka_client
from .serializers import (
    AddressSerializer,
    DatasetInfoSerializer,
    DocumentListSerializer,
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


class EntityDocumentsView(APIView):
    """GET /v1/justice/entities/{ico}/documents/"""

    def get(self, request, ico):
        service = JusticeService()
        result = service.get_entity_documents(ico)

        return Response(DocumentListSerializer(result).data)


@method_decorator(xframe_options_exempt, name="dispatch")
class DocumentProxyView(APIView):
    """
    GET /v1/justice/documents/{download_id}/

    Proxies PDF/XML downloads from or.justice.cz.
    Required because the justice.cz server needs session cookies
    that browsers can't set cross-origin.
    """

    def get(self, request, download_id):
        client = justice_sbirka_client

        try:
            content, content_type, filename = client.download_file(download_id)
        except Exception:
            return Response(
                {"error": "Failed to download document"},
                status=502,
            )

        response = HttpResponse(content, content_type=content_type)
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response
