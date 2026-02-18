from django.core.cache import cache
from django.http import JsonResponse


def health_check(request):
    """Health check endpoint — verifies Django is running and Redis is reachable."""
    cache_status = "ok"
    try:
        cache.set("health_check", "ok", 10)
        if cache.get("health_check") != "ok":
            cache_status = "error"
    except Exception:
        cache_status = "error"

    return JsonResponse({"status": "ok", "cache": cache_status})
