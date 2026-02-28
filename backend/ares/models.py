from django.db import models


class EconomicSubject(models.Model):
    ico = models.CharField(max_length=8, unique=True, db_index=True)
    business_name = models.CharField(max_length=500)
    raw_data = models.JSONField(default=dict)
    company = models.ForeignKey(
        "company.Company",
        on_delete=models.CASCADE,
        related_name="ares_records",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.ico} - {self.business_name}"
