from django.core.cache import cache
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.response import Response


@extend_schema(
    tags=["Health"],
    summary="Health check",
    description="Verifies Django is running and Redis cache is reachable.",
    responses={
        200: inline_serializer(
            "HealthCheck",
            {
                "status": serializers.CharField(),
                "cache": serializers.CharField(),
            },
        )
    },
)
@api_view(["GET"])
def health_check(request):
    cache_status = "ok"
    try:
        cache.set("health_check", "ok", 10)
        if cache.get("health_check") != "ok":
            cache_status = "error"
    except Exception:
        cache_status = "error"

    return Response({"status": "ok", "cache": cache_status})
