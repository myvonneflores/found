from django.db import migrations, models


def copy_primary_category_to_business_categories(apps, schema_editor):
    Company = apps.get_model("companies", "Company")

    for company in Company.objects.exclude(business_category__isnull=True):
        company.business_categories.add(company.business_category)


class Migration(migrations.Migration):
    dependencies = [
        ("companies", "0004_cuisinetype_company_cuisine_types"),
    ]

    operations = [
        migrations.AddField(
            model_name="company",
            name="business_categories",
            field=models.ManyToManyField(
                blank=True,
                related_name="categorized_companies",
                to="companies.businesscategory",
            ),
        ),
        migrations.RunPython(copy_primary_category_to_business_categories, migrations.RunPython.noop),
    ]
