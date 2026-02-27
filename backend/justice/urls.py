from django.urls import path

from .views import (
    DatasetListView,
    DocumentProxyView,
    EntityAddressesView,
    EntityDocumentsView,
    EntityHistoryView,
    EntityLookupView,
    EntityPersonsView,
    EntitySearchView,
    SyncStatusView,
)

app_name = "justice"

urlpatterns = [
    # Entity endpoints
    path("entities/", EntityLookupView.as_view(), name="entity-lookup"),
    path("entities/search/", EntitySearchView.as_view(), name="entity-search"),
    path("entities/<str:ico>/history/", EntityHistoryView.as_view(), name="entity-history"),
    path("entities/<str:ico>/persons/", EntityPersonsView.as_view(), name="entity-persons"),
    path("entities/<str:ico>/addresses/", EntityAddressesView.as_view(), name="entity-addresses"),
    path("entities/<str:ico>/documents/", EntityDocumentsView.as_view(), name="entity-documents"),
    # Document proxy
    path("documents/<str:download_id>/", DocumentProxyView.as_view(), name="document-proxy"),
    # Dataset / sync endpoints
    path("datasets/", DatasetListView.as_view(), name="dataset-list"),
    path("sync/status/", SyncStatusView.as_view(), name="sync-status"),
]
