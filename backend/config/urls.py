"""
Root URL config. Like your app/ directory structure in Next.js,
but explicit rather than file-system based.
"""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", include("core.urls")),
    # path("api/v1/ares/", include("ares.urls")),          # Uncommented by Chunk 3
    # path("api/v1/justice/", include("justice.urls")),     # Uncommented by Chunk 5
    # path("api/v1/contacts/", include("contacts.urls")),   # Uncommented by Chunk 4
]
