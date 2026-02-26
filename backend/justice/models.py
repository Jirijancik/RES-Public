from django.db import models


class CourtRecord(models.Model):
    """Legacy model for PDF document parsing. Kept for backwards compatibility."""

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


class Entity(models.Model):
    """A legal entity (Subjekt) from the Czech commercial registry."""

    ico = models.CharField(max_length=20, db_index=True)
    name = models.CharField(max_length=1000)
    registration_date = models.DateField(null=True, blank=True)
    deletion_date = models.DateField(null=True, blank=True)
    legal_form_code = models.CharField(max_length=50, blank=True, default="")
    legal_form_name = models.CharField(max_length=200, blank=True, default="")
    court_code = models.CharField(max_length=20, blank=True, default="")
    court_name = models.CharField(max_length=200, blank=True, default="")
    file_section = models.CharField(max_length=50, blank=True, default="")
    file_number = models.IntegerField(null=True, blank=True)
    file_reference = models.CharField(max_length=500, blank=True, default="")
    dataset_id = models.CharField(max_length=200, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["legal_form_code"]),
            models.Index(fields=["court_code"]),
            models.Index(fields=["is_active"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["ico", "dataset_id"],
                name="unique_entity_per_dataset",
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.ico})"


class EntityFact(models.Model):
    """A fact (Udaj) about an entity — headquarters, officers, capital, etc."""

    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name="facts")
    header = models.CharField(max_length=500, blank=True, default="")
    fact_type_code = models.CharField(max_length=200, db_index=True)
    fact_type_name = models.CharField(max_length=300, blank=True, default="")
    value_text = models.TextField(blank=True, default="")
    value_data = models.JSONField(null=True, blank=True)
    registration_date = models.DateField(null=True, blank=True)
    deletion_date = models.DateField(null=True, blank=True)
    function_name = models.CharField(max_length=200, blank=True, default="")
    function_from = models.DateField(null=True, blank=True)
    function_to = models.DateField(null=True, blank=True)
    membership_from = models.DateField(null=True, blank=True)
    membership_to = models.DateField(null=True, blank=True)
    parent_fact = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="sub_facts"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["entity", "fact_type_code"]),
        ]

    def __str__(self):
        return f"Fact {self.fact_type_code}: {self.header}"


class Person(models.Model):
    """A person (Osoba) associated with a fact — natural or legal person."""

    fact = models.OneToOneField(
        EntityFact, on_delete=models.CASCADE, related_name="person"
    )
    first_name = models.CharField(max_length=200, blank=True, default="")
    last_name = models.CharField(max_length=200, blank=True, default="")
    birth_date = models.DateField(null=True, blank=True)
    title_before = models.CharField(max_length=200, blank=True, default="")
    title_after = models.CharField(max_length=200, blank=True, default="")
    entity_name = models.CharField(max_length=1000, blank=True, default="")
    entity_ico = models.CharField(max_length=50, blank=True, default="")
    reg_number = models.CharField(max_length=300, blank=True, default="")
    euid = models.CharField(max_length=300, blank=True, default="")
    person_text = models.TextField(blank=True, default="")
    is_natural_person = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=["last_name", "first_name"]),
            models.Index(fields=["entity_ico"]),
        ]

    def __str__(self):
        if self.is_natural_person:
            return f"{self.first_name} {self.last_name}"
        return self.entity_name


class Address(models.Model):
    """An address associated with a fact — entity address or person's residence."""

    ADDRESS_TYPE_CHOICES = [
        ("address", "Address"),
        ("residence", "Residence"),
    ]

    fact = models.ForeignKey(
        EntityFact, on_delete=models.CASCADE, related_name="addresses"
    )
    address_type = models.CharField(
        max_length=20, choices=ADDRESS_TYPE_CHOICES, default="address"
    )
    country = models.CharField(max_length=200, blank=True, default="")
    municipality = models.CharField(max_length=200, blank=True, default="")
    city_part = models.CharField(max_length=200, blank=True, default="")
    street = models.CharField(max_length=300, blank=True, default="")
    house_number = models.CharField(max_length=50, blank=True, default="")
    orientation_number = models.CharField(max_length=50, blank=True, default="")
    evidence_number = models.CharField(max_length=50, blank=True, default="")
    number_text = models.CharField(max_length=100, blank=True, default="")
    postal_code = models.CharField(max_length=50, blank=True, default="")
    district = models.CharField(max_length=200, blank=True, default="")
    full_address = models.TextField(blank=True, default="")
    supplementary_text = models.TextField(blank=True, default="")

    class Meta:
        indexes = [
            models.Index(fields=["municipality"]),
            models.Index(fields=["postal_code"]),
        ]

    def __str__(self):
        return self.full_address or f"{self.street} {self.house_number}, {self.municipality}"


class DatasetSync(models.Model):
    """Tracks sync status per dataset for incremental updates."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("downloading", "Downloading"),
        ("parsing", "Parsing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    dataset_id = models.CharField(max_length=200, unique=True, db_index=True)
    legal_form = models.CharField(max_length=50)
    dataset_type = models.CharField(max_length=20)
    location = models.CharField(max_length=50)
    year = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    last_synced_at = models.DateTimeField(null=True, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    entity_count = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, default="")
    duration_seconds = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["legal_form", "location"]),
            models.Index(fields=["last_synced_at"]),
        ]

    def __str__(self):
        return f"{self.dataset_id} ({self.status})"
