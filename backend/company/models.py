from django.db import models


class Company(models.Model):
    """Hub entity representing a unique Czech company identified by ICO."""

    ico = models.CharField(max_length=8, unique=True, db_index=True)
    name = models.CharField(max_length=500)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # --- Denormalized search fields (Phase 2) ---
    # Populated from ARES/Justice during fetch/sync for fast multi-param filtering.
    legal_form = models.CharField(max_length=10, blank=True, default="", db_index=True)
    region_code = models.IntegerField(null=True, blank=True, db_index=True)
    region_name = models.CharField(max_length=100, blank=True, default="")
    employee_category = models.CharField(max_length=50, blank=True, default="", db_index=True)
    latest_revenue = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True, db_index=True
    )
    nace_primary = models.CharField(max_length=10, blank=True, default="", db_index=True)

    class Meta:
        verbose_name_plural = "companies"
        indexes = [
            models.Index(
                fields=["legal_form", "region_code"],
                name="idx_company_form_region",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.ico})"
