import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("company", "0001_initial"),
        ("ares", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="economicsubject",
            name="company",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="ares_records",
                to="company.company",
            ),
        ),
        migrations.AddField(
            model_name="economicsubject",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True, default=django.utils.timezone.now
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="economicsubject",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
    ]
