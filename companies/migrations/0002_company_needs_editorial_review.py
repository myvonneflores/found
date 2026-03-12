from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("companies", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="company",
            name="needs_editorial_review",
            field=models.BooleanField(default=False),
        ),
    ]
