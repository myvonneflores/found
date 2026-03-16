from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("companies", "0005_company_business_categories"),
    ]

    operations = [
        migrations.AddField(
            model_name="company",
            name="is_published",
            field=models.BooleanField(default=True),
        ),
    ]
