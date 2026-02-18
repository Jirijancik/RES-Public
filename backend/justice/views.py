from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.exceptions import ExternalAPIError
from .serializers import (
    JusticeDocumentRequestSerializer,
    JusticeDocumentResponseSerializer,
    JusticeSearchRequestSerializer,
    JusticeCompanyRecordSerializer,
)
from .services import JusticeService


class JusticeDocumentView(APIView):
    def get(self, request):
        serializer = JusticeDocumentRequestSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        service = JusticeService()
        try:
            result = service.get_document(
                ico=serializer.validated_data["ico"],
                document_id=serializer.validated_data["document_id"],
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(JusticeDocumentResponseSerializer(result).data)


class JusticeSearchView(APIView):
    def get(self, request):
        serializer = JusticeSearchRequestSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        service = JusticeService()
        records = service.import_companies_csv(
            dataset_url=serializer.validated_data["dataset_url"],
        )

        return Response(JusticeCompanyRecordSerializer(records, many=True).data)
