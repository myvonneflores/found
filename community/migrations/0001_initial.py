from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

import core.models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("companies", "0004_cuisinetype_company_cuisine_types"),
        ("users", "0004_user_account_fields_personalprofile_businessclaim"),
    ]

    operations = [
        migrations.CreateModel(
            name="CuratedList",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("id_hash", models.CharField(default=core.models.generate_short_id, editable=False, help_text="Unique 8-character identifier for client-side use", max_length=8, unique=True, verbose_name="ID Hash")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("title", models.CharField(max_length=120)),
                ("description", models.TextField(blank=True)),
                ("is_public", models.BooleanField(default=False)),
                (
                    "user",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="curated_lists", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={"ordering": ["-updated_at", "-pk"]},
        ),
        migrations.CreateModel(
            name="Favorite",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("id_hash", models.CharField(default=core.models.generate_short_id, editable=False, help_text="Unique 8-character identifier for client-side use", max_length=8, unique=True, verbose_name="ID Hash")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                (
                    "company",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="favorited_by", to="companies.company"),
                ),
                (
                    "user",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="favorites", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={"ordering": ["-created_at", "-pk"]},
        ),
        migrations.CreateModel(
            name="CuratedListItem",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("id_hash", models.CharField(default=core.models.generate_short_id, editable=False, help_text="Unique 8-character identifier for client-side use", max_length=8, unique=True, verbose_name="ID Hash")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("note", models.TextField(blank=True)),
                ("position", models.PositiveIntegerField(default=1)),
                (
                    "company",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="list_items", to="companies.company"),
                ),
                (
                    "curated_list",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="community.curatedlist"),
                ),
            ],
            options={"ordering": ["position", "created_at", "pk"]},
        ),
        migrations.AddConstraint(
            model_name="favorite",
            constraint=models.UniqueConstraint(fields=("user", "company"), name="unique_favorite_per_user_company"),
        ),
        migrations.AddConstraint(
            model_name="curatedlistitem",
            constraint=models.UniqueConstraint(fields=("curated_list", "company"), name="unique_company_per_curated_list"),
        ),
    ]
