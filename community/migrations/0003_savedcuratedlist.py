from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

import core.models


class Migration(migrations.Migration):
    dependencies = [
        ("community", "0002_recommendation"),
    ]

    operations = [
        migrations.CreateModel(
            name="SavedCuratedList",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("id_hash", models.CharField(default=core.models.generate_short_id, editable=False, help_text="Unique 8-character identifier for client-side use", max_length=8, unique=True, verbose_name="ID Hash")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("curated_list", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="saved_by", to="community.curatedlist")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="saved_curated_lists", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at", "-pk"]},
        ),
        migrations.AddConstraint(
            model_name="savedcuratedlist",
            constraint=models.UniqueConstraint(fields=("user", "curated_list"), name="unique_saved_curated_list_per_user"),
        ),
    ]
