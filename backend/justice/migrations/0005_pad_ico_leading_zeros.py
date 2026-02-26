"""
Data migration: pad all Entity ICO values to 8 digits with leading zeros.

Czech ICO (IČO) is always 8 digits. The justice.cz XML open data files store
ICOs without leading zeros (e.g. "5113610" instead of "05113610"). This
migration normalises the ~34% of stored entities that have fewer than 8 digits.
"""
from django.db import migrations


def pad_icos(apps, schema_editor):
    Entity = apps.get_model("justice", "Entity")
    # Update all entities whose ICO is shorter than 8 characters.
    # Raw SQL is fastest for a bulk update on ~100k rows.
    Entity.objects.raw(
        "UPDATE justice_entity SET ico = LPAD(ico, 8, '0') WHERE LENGTH(ico) < 8"
    )
    # Django raw() is lazy; force execution via the cursor instead.
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            "UPDATE justice_entity SET ico = LPAD(ico, 8, '0') WHERE LENGTH(ico) < 8"
        )


def unpad_icos(apps, schema_editor):
    # Reverse: strip leading zeros (restore original state).
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            "UPDATE justice_entity SET ico = LTRIM(ico, '0') WHERE ico LIKE '0%'"
        )


class Migration(migrations.Migration):

    dependencies = [
        ("justice", "0004_alter_entity_file_reference_and_more"),
    ]

    operations = [
        migrations.RunPython(pad_icos, unpad_icos),
    ]
