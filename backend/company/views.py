from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    CompanyDetailSerializer,
    CompanySearchRequestSerializer,
    CompanySearchResultSerializer,
)
from .services import CompanyService


class CompanyDetailView(APIView):
    @extend_schema(
        tags=["Companies"],
        summary="Get unified company by ICO",
        description=(
            "Retrieve a unified company record by ICO, merging data from both "
            "ARES and Justice sources into a single response."
        ),
        responses={200: CompanyDetailSerializer},
    )
    def get(self, request, ico):
        service = CompanyService()
        result = service.get_by_ico(ico)
        return Response(CompanyDetailSerializer(result).data)


class CompanySearchView(APIView):
    @extend_schema(
        tags=["Companies"],
        summary="Search unified companies",
        description=(
            "Search the unified company hub with multi-parameter filters. "
            "Combines data from ARES and Justice into a single searchable index."
        ),
        parameters=[
            OpenApiParameter(name="name", description="Company name (partial match)", required=False, type=str),
            OpenApiParameter(name="ico", description="Company identification number", required=False, type=str),
            OpenApiParameter(name="legalForm", description="Legal form code (e.g. 112 = s.r.o.)", required=False, type=str),
            OpenApiParameter(name="regionCode", description="Region code (e.g. 19 = Praha)", required=False, type=int),
            OpenApiParameter(name="employeeCategory", description="Employee count category", required=False, type=str),
            OpenApiParameter(name="revenueMin", description="Minimum revenue filter", required=False, type=float),
            OpenApiParameter(name="revenueMax", description="Maximum revenue filter", required=False, type=float),
            OpenApiParameter(name="nace", description="NACE activity code", required=False, type=str),
            OpenApiParameter(
                name="status",
                description="Filter by company status",
                required=False,
                type=str,
                enum=["active", "inactive", "all"],
            ),
            OpenApiParameter(name="offset", description="Pagination offset (default: 0)", required=False, type=int),
            OpenApiParameter(name="limit", description="Page size, 1-100 (default: 25)", required=False, type=int),
        ],
        responses={200: CompanySearchResultSerializer},
    )
    def get(self, request):
        serializer = CompanySearchRequestSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        service = CompanyService()
        result = service.search(serializer.validated_data)

        return Response(CompanySearchResultSerializer(result).data)
