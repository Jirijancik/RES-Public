from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    EconomicSubjectSerializer,
    SearchRequestSerializer,
    SearchResultSerializer,
)
from .services import AresService


class AresSearchView(APIView):
    def post(self, request):
        serializer = SearchRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AresService()
        result = service.search(serializer.validated_data)

        return Response(SearchResultSerializer(result).data)


class AresSubjectDetailView(APIView):
    def get(self, request, ico):
        service = AresService()
        result = service.get_by_ico(ico)

        return Response(EconomicSubjectSerializer(result).data)
