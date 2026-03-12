from django.db import migrations, models

import core.models


class Migration(migrations.Migration):
    dependencies = [
        ("companies", "0002_company_needs_editorial_review"),
    ]

    operations = [
        migrations.CreateModel(
            name="OwnershipMarker",
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
                ("name", models.CharField(max_length=100, unique=True)),
                ("description", models.TextField(blank=True)),
            ],
            options={"verbose_name_plural": "Ownership markers", "ordering": ["name"]},
        ),
        migrations.AddField(
            model_name="company",
            name="ownership_markers",
            field=models.ManyToManyField(blank=True, related_name="companies", to="companies.ownershipmarker"),
        ),
    ]
