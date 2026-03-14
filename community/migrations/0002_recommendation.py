from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

import core.models


class Migration(migrations.Migration):
    dependencies = [
        ("companies", "0004_cuisinetype_company_cuisine_types"),
        ("community", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Recommendation",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("id_hash", models.CharField(default=core.models.generate_short_id, editable=False, help_text="Unique 8-character identifier for client-side use", max_length=8, unique=True, verbose_name="ID Hash")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("title", models.CharField(max_length=140)),
                ("body", models.TextField()),
                ("is_public", models.BooleanField(default=True)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="recommendations", to="companies.company")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="recommendations", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-updated_at", "-pk"]},
        ),
    ]
