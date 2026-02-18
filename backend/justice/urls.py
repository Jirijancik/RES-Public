from django.urls import path
from .views import JusticeDocumentView, JusticeSearchView

urlpatterns = [
    path("documents/", JusticeDocumentView.as_view(), name="justice-document"),
    path("search/", JusticeSearchView.as_view(), name="justice-search"),
]
