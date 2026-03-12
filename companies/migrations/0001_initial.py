from django.db import migrations, models
import django.db.models.deletion

import core.models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="BusinessCategory",
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
            options={"verbose_name_plural": "Business categories", "ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="ProductCategory",
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
            options={"verbose_name_plural": "Product categories", "ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="SustainabilityMarker",
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
            options={"verbose_name_plural": "Sustainability markers", "ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Company",
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
                ("slug", models.SlugField(blank=True, max_length=255, unique=True)),
                ("description", models.TextField(blank=True)),
                ("website", models.URLField(blank=True)),
                ("founded_year", models.PositiveIntegerField(blank=True, null=True)),
                ("address", models.CharField(blank=True, max_length=255)),
                ("city", models.CharField(blank=True, max_length=120)),
                ("state", models.CharField(blank=True, max_length=120)),
                ("zip_code", models.CharField(blank=True, max_length=20)),
                ("country", models.CharField(blank=True, max_length=120)),
                ("instagram_handle", models.CharField(blank=True, max_length=100)),
                ("facebook_page", models.URLField(blank=True)),
                ("linkedin_page", models.URLField(blank=True)),
                ("is_vegan_friendly", models.BooleanField(default=False)),
                ("is_gf_friendly", models.BooleanField(default=False)),
                ("annual_revenue", models.BigIntegerField(blank=True, null=True)),
                ("number_of_employees", models.PositiveIntegerField(blank=True, null=True)),
                (
                    "business_category",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="companies",
                        to="companies.businesscategory",
                    ),
                ),
                (
                    "product_categories",
                    models.ManyToManyField(blank=True, related_name="companies", to="companies.productcategory"),
                ),
                (
                    "sustainability_markers",
                    models.ManyToManyField(
                        blank=True,
                        related_name="companies",
                        to="companies.sustainabilitymarker",
                    ),
                ),
            ],
            options={"ordering": ["name"]},
        ),
    ]
