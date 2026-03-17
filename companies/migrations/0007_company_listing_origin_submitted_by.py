from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("companies", "0006_company_is_published"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="company",
            name="listing_origin",
            field=models.CharField(
                choices=[
                    ("imported", "Imported"),
                    ("owner", "Owner"),
                    ("community", "Community"),
                ],
                default="imported",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="company",
            name="submitted_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="submitted_companies",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
