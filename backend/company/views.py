from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    CompanyDetailSerializer,
    CompanySearchRequestSerializer,
    CompanySearchResultSerializer,
)
from .services import CompanyService


class CompanyDetailView(APIView):
    """GET /v1/companies/{ico}/"""

    def get(self, request, ico):
        service = CompanyService()
        result = service.get_by_ico(ico)
        return Response(CompanyDetailSerializer(result).data)


class CompanySearchView(APIView):
    """GET /v1/companies/search/?legalForm=112&regionCode=19&..."""

    def get(self, request):
        serializer = CompanySearchRequestSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        service = CompanyService()
        result = service.search(serializer.validated_data)

        return Response(CompanySearchResultSerializer(result).data)
