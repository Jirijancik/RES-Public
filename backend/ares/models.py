from django.db import models


class EconomicSubject(models.Model):
    ico = models.CharField(max_length=8, unique=True, db_index=True)
    business_name = models.CharField(max_length=500)
    raw_data = models.JSONField(default=dict)

    def __str__(self):
        return f"{self.ico} - {self.business_name}"
