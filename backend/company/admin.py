from django.contrib import admin
from .models import Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("ico", "name", "legal_form", "region_name", "employee_category", "is_active", "updated_at")
    search_fields = ("ico", "name")
    list_filter = ("is_active", "legal_form", "region_code", "employee_category")
