# Generated manually for Justice Open Data models.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("justice", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Entity",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("ico", models.CharField(db_index=True, max_length=20)),
                ("name", models.CharField(max_length=1000)),
                ("registration_date", models.DateField(blank=True, null=True)),
                ("deletion_date", models.DateField(blank=True, null=True)),
                ("legal_form_code", models.CharField(blank=True, default="", max_length=50)),
                ("legal_form_name", models.CharField(blank=True, default="", max_length=200)),
                ("court_code", models.CharField(blank=True, default="", max_length=20)),
                ("court_name", models.CharField(blank=True, default="", max_length=200)),
                ("file_section", models.CharField(blank=True, default="", max_length=10)),
                ("file_number", models.IntegerField(blank=True, null=True)),
                ("file_reference", models.CharField(blank=True, default="", max_length=100)),
                ("dataset_id", models.CharField(blank=True, default="", max_length=200)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "indexes": [
                    models.Index(fields=["name"], name="justice_ent_name_idx"),
                    models.Index(fields=["legal_form_code"], name="justice_ent_lf_idx"),
                    models.Index(fields=["court_code"], name="justice_ent_court_idx"),
                    models.Index(fields=["is_active"], name="justice_ent_active_idx"),
                ],
                "constraints": [
                    models.UniqueConstraint(fields=["ico", "dataset_id"], name="unique_entity_per_dataset"),
                ],
            },
        ),
        migrations.CreateModel(
            name="DatasetSync",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("dataset_id", models.CharField(db_index=True, max_length=200, unique=True)),
                ("legal_form", models.CharField(max_length=50)),
                ("dataset_type", models.CharField(max_length=20)),
                ("location", models.CharField(max_length=50)),
                ("year", models.IntegerField()),
                ("status", models.CharField(choices=[("pending", "Pending"), ("downloading", "Downloading"), ("parsing", "Parsing"), ("completed", "Completed"), ("failed", "Failed")], default="pending", max_length=20)),
                ("last_synced_at", models.DateTimeField(blank=True, null=True)),
                ("file_size", models.BigIntegerField(blank=True, null=True)),
                ("entity_count", models.IntegerField(default=0)),
                ("error_message", models.TextField(blank=True, default="")),
                ("duration_seconds", models.FloatField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "indexes": [
                    models.Index(fields=["status"], name="justice_ds_status_idx"),
                    models.Index(fields=["legal_form", "location"], name="justice_ds_lf_loc_idx"),
                    models.Index(fields=["last_synced_at"], name="justice_ds_synced_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="EntityFact",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("header", models.CharField(blank=True, default="", max_length=500)),
                ("fact_type_code", models.CharField(db_index=True, max_length=100)),
                ("fact_type_name", models.CharField(blank=True, default="", max_length=300)),
                ("value_text", models.TextField(blank=True, default="")),
                ("value_data", models.JSONField(blank=True, null=True)),
                ("registration_date", models.DateField(blank=True, null=True)),
                ("deletion_date", models.DateField(blank=True, null=True)),
                ("function_name", models.CharField(blank=True, default="", max_length=200)),
                ("function_from", models.DateField(blank=True, null=True)),
                ("function_to", models.DateField(blank=True, null=True)),
                ("membership_from", models.DateField(blank=True, null=True)),
                ("membership_to", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("entity", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="facts", to="justice.entity")),
                ("parent_fact", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="sub_facts", to="justice.entityfact")),
            ],
            options={
                "indexes": [
                    models.Index(fields=["entity", "fact_type_code"], name="justice_fact_ent_type_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="Person",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("first_name", models.CharField(blank=True, default="", max_length=200)),
                ("last_name", models.CharField(blank=True, default="", max_length=200)),
                ("birth_date", models.DateField(blank=True, null=True)),
                ("title_before", models.CharField(blank=True, default="", max_length=100)),
                ("title_after", models.CharField(blank=True, default="", max_length=100)),
                ("entity_name", models.CharField(blank=True, default="", max_length=500)),
                ("entity_ico", models.CharField(blank=True, default="", max_length=20)),
                ("reg_number", models.CharField(blank=True, default="", max_length=100)),
                ("euid", models.CharField(blank=True, default="", max_length=100)),
                ("person_text", models.TextField(blank=True, default="")),
                ("is_natural_person", models.BooleanField(default=True)),
                ("fact", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="person", to="justice.entityfact")),
            ],
            options={
                "indexes": [
                    models.Index(fields=["last_name", "first_name"], name="justice_person_name_idx"),
                    models.Index(fields=["entity_ico"], name="justice_person_ico_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="Address",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("address_type", models.CharField(choices=[("address", "Address"), ("residence", "Residence")], default="address", max_length=20)),
                ("country", models.CharField(blank=True, default="", max_length=200)),
                ("municipality", models.CharField(blank=True, default="", max_length=200)),
                ("city_part", models.CharField(blank=True, default="", max_length=200)),
                ("street", models.CharField(blank=True, default="", max_length=300)),
                ("house_number", models.CharField(blank=True, default="", max_length=20)),
                ("orientation_number", models.CharField(blank=True, default="", max_length=20)),
                ("evidence_number", models.CharField(blank=True, default="", max_length=20)),
                ("number_text", models.CharField(blank=True, default="", max_length=50)),
                ("postal_code", models.CharField(blank=True, default="", max_length=20)),
                ("district", models.CharField(blank=True, default="", max_length=200)),
                ("full_address", models.TextField(blank=True, default="")),
                ("supplementary_text", models.TextField(blank=True, default="")),
                ("fact", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="addresses", to="justice.entityfact")),
            ],
            options={
                "indexes": [
                    models.Index(fields=["municipality"], name="justice_addr_muni_idx"),
                    models.Index(fields=["postal_code"], name="justice_addr_psc_idx"),
                ],
            },
        ),
    ]
