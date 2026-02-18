from django.db import models


class CourtRecord(models.Model):
    """Placeholder model for future persistence of parsed justice documents."""

    ico = models.CharField(max_length=20, db_index=True)
    document_id = models.CharField(max_length=100)
    document_type = models.CharField(max_length=50, blank=True, default="")
    parsed_data = models.JSONField(default=dict, blank=True)
    source_url = models.URLField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("ico", "document_id")
        ordering = ["-created_at"]

    def __str__(self):
        return f"CourtRecord {self.ico} - {self.document_id}"
