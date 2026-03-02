from drf_spectacular.utils import OpenApiExample, extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    EconomicSubjectSerializer,
    SearchRequestSerializer,
    AresSearchResultSerializer,
)
from .services import AresService


class AresSearchView(APIView):
    @extend_schema(
        tags=["ARES"],
        summary="Search ARES business registry",
        description=(
            "Search Czech ARES (Administrativní registr ekonomických subjektů) "
            "for economic subjects by name, ICO, legal form, or location. "
            "Results are cached for 15 minutes."
        ),
        request=SearchRequestSerializer,
        responses={200: AresSearchResultSerializer},
        examples=[
            OpenApiExample(
                "Search by business name",
                value={"businessName": "Škoda", "start": 0, "count": 10},
                request_only=True,
            ),
            OpenApiExample(
                "Search by ICO",
                value={"ico": ["00027006"]},
                request_only=True,
            ),
        ],
    )
    def post(self, request):
        serializer = SearchRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AresService()
        result = service.search(serializer.validated_data)

        return Response(AresSearchResultSerializer(result).data)


class AresSubjectDetailView(APIView):
    @extend_schema(
        tags=["ARES"],
        summary="Get ARES subject by ICO",
        description=(
            "Retrieve full detail of an economic subject from ARES by its ICO "
            "(identification number). Uses a 3-tier cache: Redis -> PostgreSQL -> ARES API."
        ),
        responses={200: EconomicSubjectSerializer},
    )
    def get(self, request, ico):
        service = AresService()
        result = service.get_by_ico(ico)

        return Response(EconomicSubjectSerializer(result).data)
