"""
Justice API endpoints. Thin handlers: validate -> service -> serialize -> respond.
"""
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from drf_spectacular.utils import OpenApiParameter, extend_schema
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
    JusticeSearchResultSerializer,
    SyncStatusSerializer,
)
from .services import JusticeService


class EntityLookupView(APIView):
    @extend_schema(
        tags=["Justice"],
        summary="Lookup entity by ICO",
        description=(
            "Retrieve a single Justice entity by its ICO (identification number). "
            "Returns the full entity detail including all registered facts."
        ),
        parameters=[
            OpenApiParameter(
                name="ico",
                description="Company identification number (IČO)",
                required=True,
                type=str,
            ),
        ],
        responses={200: EntityDetailSerializer},
    )
    def get(self, request):
        serializer = EntityLookupSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        service = JusticeService()
        result = service.get_entity_by_ico(serializer.validated_data["ico"])

        return Response(EntityDetailSerializer(result).data)


class EntitySearchView(APIView):
    @extend_schema(
        tags=["Justice"],
        summary="Search Justice entities",
        description=(
            "Search the Czech Commercial Registry (obchodní rejstřík) for entities "
            "by name, legal form, location, or status. Results are paginated."
        ),
        parameters=[
            OpenApiParameter(name="name", description="Entity name (partial match)", required=False, type=str),
            OpenApiParameter(name="legalForm", description="Legal form code (e.g. 112 = s.r.o.)", required=False, type=str),
            OpenApiParameter(name="location", description="Court or location filter", required=False, type=str),
            OpenApiParameter(
                name="status",
                description="Filter by entity status",
                required=False,
                type=str,
                enum=["active", "deleted", "all"],
            ),
            OpenApiParameter(name="offset", description="Pagination offset (default: 0)", required=False, type=int),
            OpenApiParameter(name="limit", description="Page size, 1-100 (default: 20)", required=False, type=int),
        ],
        responses={200: JusticeSearchResultSerializer},
    )
    def get(self, request):
        serializer = EntitySearchSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        service = JusticeService()
        result = service.search_entities(serializer.validated_data)

        return Response(JusticeSearchResultSerializer(result).data)


class EntityHistoryView(APIView):
    @extend_schema(
        tags=["Justice"],
        summary="Get entity change history",
        description="Retrieve the chronological history of registered changes for a Justice entity.",
        responses={200: HistoryEntrySerializer(many=True)},
    )
    def get(self, request, ico):
        service = JusticeService()
        result = service.get_entity_history(ico)

        return Response(HistoryEntrySerializer(result, many=True).data)


class EntityPersonsView(APIView):
    @extend_schema(
        tags=["Justice"],
        summary="Get entity persons",
        description=(
            "List all persons (statutory bodies, shareholders, prokura holders) "
            "associated with a Justice entity, including their function dates."
        ),
        responses={200: PersonWithFactSerializer(many=True)},
    )
    def get(self, request, ico):
        service = JusticeService()
        result = service.get_entity_persons(ico)

        return Response(PersonWithFactSerializer(result, many=True).data)


class EntityAddressesView(APIView):
    @extend_schema(
        tags=["Justice"],
        summary="Get entity addresses",
        description="List all registered addresses (seat, residence) for a Justice entity.",
        responses={200: AddressSerializer(many=True)},
    )
    def get(self, request, ico):
        service = JusticeService()
        result = service.get_entity_addresses(ico)

        return Response(AddressSerializer(result, many=True).data)


class DatasetListView(APIView):
    @extend_schema(
        tags=["Justice"],
        summary="List dataset catalog",
        description=(
            "List all dataset sync records from the Justice open data portal (dataor.justice.cz). "
            "Shows sync status, entity counts, and last sync timestamps."
        ),
        responses={200: DatasetInfoSerializer(many=True)},
    )
    def get(self, request):
        service = JusticeService()
        result = service.list_datasets()

        return Response(DatasetInfoSerializer(result, many=True).data)


class SyncStatusView(APIView):
    @extend_schema(
        tags=["Justice"],
        summary="Get sync health status",
        description="Summary of the Justice data synchronization pipeline health.",
        responses={200: SyncStatusSerializer},
    )
    def get(self, request):
        service = JusticeService()
        result = service.get_sync_status()

        return Response(SyncStatusSerializer(result).data)


class EntityDocumentsView(APIView):
    @extend_schema(
        tags=["Justice"],
        summary="Get entity documents (Sbírka listin)",
        description=(
            "Retrieve the list of documents from Sbírka listin (Collection of Deeds) "
            "for a Justice entity. Includes financial statements with parsed data "
            "when available. Data is scraped from or.justice.cz."
        ),
        responses={200: DocumentListSerializer},
    )
    def get(self, request, ico):
        service = JusticeService()
        result = service.get_entity_documents(ico)

        return Response(DocumentListSerializer(result).data)


@method_decorator(xframe_options_exempt, name="dispatch")
class DocumentProxyView(APIView):
    @extend_schema(
        tags=["Justice"],
        summary="Download document file",
        description=(
            "Proxy download of a PDF or XML document from or.justice.cz. "
            "Required because the justice.cz server needs session cookies "
            "that browsers can't set cross-origin."
        ),
        responses={
            (200, "application/pdf"): bytes,
            (200, "application/xml"): bytes,
            502: {"type": "object", "properties": {"error": {"type": "string"}}},
        },
    )
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
