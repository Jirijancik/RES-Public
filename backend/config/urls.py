"""
Root URL config. Like your app/ directory structure in Next.js,
but explicit rather than file-system based.
"""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path


def health_check(request):
    """Temporary inline health check. Moved to core.urls in Chunk 2."""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check),
    # path("api/v1/ares/", include("ares.urls")),          # Uncommented by Chunk 3
    # path("api/v1/justice/", include("justice.urls")),     # Uncommented by Chunk 5
    # path("api/v1/contacts/", include("contacts.urls")),   # Uncommented by Chunk 4
]
