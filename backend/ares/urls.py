from django.urls import path

from . import views

app_name = "ares"

urlpatterns = [
    path("search/", views.AresSearchView.as_view(), name="search"),
    path(
        "subjects/<str:ico>/",
        views.AresSubjectDetailView.as_view(),
        name="subject-detail",
    ),
]
