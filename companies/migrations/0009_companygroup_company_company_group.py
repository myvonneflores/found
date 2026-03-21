from django.db import migrations, models
import django.db.models.deletion

import core.models


class Migration(migrations.Migration):
    dependencies = [
        ("companies", "0008_company_business_hours"),
    ]

    operations = [
        migrations.CreateModel(
            name="CompanyGroup",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                (
                    "id_hash",
                    models.CharField(
                        default=core.models.generate_short_id,
                        editable=False,
                        help_text="Unique 8-character identifier for client-side use",
                        max_length=8,
                        unique=True,
                        verbose_name="ID Hash",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("name", models.CharField(max_length=255)),
                ("normalized_hostname", models.CharField(blank=True, max_length=255)),
            ],
            options={
                "ordering": ["name", "created_at", "pk"],
            },
        ),
        migrations.AddField(
            model_name="company",
            name="company_group",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="companies",
                to="companies.companygroup",
            ),
        ),
    ]
