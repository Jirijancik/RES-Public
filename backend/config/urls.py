"""
Root URL config. Like your app/ directory structure in Next.js,
but explicit rather than file-system based.
"""
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    # API documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # API endpoints
    path("api/health/", include("core.urls")),
    path("api/v1/ares/", include("ares.urls")),
    path("api/v1/justice/", include("justice.urls")),
    path("api/v1/companies/", include("company.urls")),
    path("api/v1/contacts/", include("contacts.urls")),
]
