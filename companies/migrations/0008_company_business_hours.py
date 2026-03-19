from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("companies", "0007_company_listing_origin_submitted_by"),
    ]

    operations = [
        migrations.AddField(
            model_name="company",
            name="business_hours",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="company",
            name="business_hours_last_verified_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="company",
            name="business_hours_raw",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="company",
            name="business_hours_source",
            field=models.CharField(
                blank=True,
                choices=[
                    ("owner_manual", "Owner manual"),
                    ("website_structured_data", "Website structured data"),
                    ("website_text_extraction", "Website text extraction"),
                    ("google_business_profile", "Google Business Profile"),
                    ("bulk_import", "Bulk import"),
                    ("editorial_manual", "Editorial manual"),
                ],
                max_length=32,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="company",
            name="business_hours_source_url",
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name="company",
            name="business_hours_timezone",
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
    ]
