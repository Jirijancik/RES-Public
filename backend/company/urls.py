from django.urls import path
from . import views

urlpatterns = [
    path("search/", views.CompanySearchView.as_view(), name="company-search"),
    path("<str:ico>/", views.CompanyDetailView.as_view(), name="company-detail"),
]
