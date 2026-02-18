from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


class ExternalAPIError(Exception):
    def __init__(
        self,
        message: str,
        status_code: int | None = None,
        service_name: str = "external",
    ):
        self.message = message
        self.status_code = status_code
        self.service_name = service_name
        super().__init__(message)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if isinstance(exc, ExternalAPIError):
        return Response(
            {"error": exc.message, "service": exc.service_name},
            status=exc.status_code or status.HTTP_502_BAD_GATEWAY,
        )

    return response
