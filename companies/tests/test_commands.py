import csv
import tempfile

import pytest
from django.core.management import call_command

from companies.models import BusinessCategory, Company, ProductCategory


def write_csv(rows):
    """Write rows to a temporary CSV file and return its path."""
    temp_file = tempfile.NamedTemporaryFile(
        mode="w", newline="", suffix=".csv", delete=False
    )
    writer = csv.DictWriter(
        temp_file,
        fieldnames=[
            "name",
            "description",
            "about_us",
            "website",
            "domain",
            "founded_year",
            "address",
            "city",
            "state",
            "zip",
            "country",
            "business_category",
            "product_categories",
            "sustainability_markers",
            "instagram_handle",
            "facebook_company_page",
            "linkedin_company_page",
            "annualrevenue",
            "total_revenue",
            "numberofemployees",
            "owner_demographics",
            "vegan_gf_friendly_",
        ],
    )
    writer.writeheader()
    writer.writerows(rows)
    temp_file.close()
    return temp_file.name


@pytest.mark.django_db
class TestImportCompaniesCommand:
    def test_creates_models_and_taxonomies(self):
        csv_path = write_csv(
            [
                {
                    "name": "Blossoming Lotus Cafe",
                    "description": "Plant-based food company.",
                    "website": "blpdx.com",
                    "founded_year": "2005",
                    "address": "2122 NW Quimby St",
                    "city": "Portland",
                    "state": "OR",
                    "zip": "97210",
                    "country": "United States",
                    "business_category": "Food",
                    "product_categories": "Cafe;Bakery",
                    "sustainability_markers": "Focused on Sustainable Products and/or Services;Carries Locally Made Goods",
                    "instagram_handle": "https://www.instagram.com/blossominglotus/",
                    "facebook_company_page": "https://www.facebook.com/blossominglotus/",
                    "linkedin_company_page": "www.linkedin.com/company/blossoming-lotus-portland-llc",
                    "annualrevenue": "1000000",
                    "numberofemployees": "10",
                    "owner_demographics": "Woman Owned;BIPOC Owned",
                    "vegan_gf_friendly_": "Vegan Friendly;Gluten Free Friendly",
                }
            ]
        )

        call_command("import_companies", csv_path)

        company = Company.objects.get(name="Blossoming Lotus Cafe")
        assert company.website == "https://blpdx.com"
        assert company.instagram_handle == "blossominglotus"
        assert company.business_category.name == "Food"
        assert company.is_vegan_friendly is True
        assert company.is_gf_friendly is True
        assert sorted(company.ownership_markers.values_list("name", flat=True)) == [
            "BIPOC Owned",
            "Woman Owned",
        ]
        assert company.needs_editorial_review is False
        assert company.annual_revenue is None
        assert company.number_of_employees is None
        assert company.product_categories.count() == 2
        assert company.sustainability_markers.count() == 2

    def test_normalizes_categories_and_backfills_us_country(self):
        csv_path = write_csv(
            [
                {
                    "name": "Mixed Category Co",
                    "domain": "mixed.example",
                    "state": "or",
                    "business_category": "Retail;Health/Wellness & Beauty",
                    "product_categories": "Kid's;Make Up/Skin Care;Music / Records",
                }
            ]
        )

        call_command("import_companies", csv_path)

        company = Company.objects.get(name="Mixed Category Co")
        assert company.business_category.name == "Health/Wellness & Beauty"
        assert company.country == "United States"
        assert sorted(company.product_categories.values_list("name", flat=True)) == [
            "Makeup/Skincare",
            "Music/Records",
        ]

    def test_drops_audience_labels_and_backfills_portland_state(self):
        csv_path = write_csv(
            [
                {
                    "name": "Audience Cleanup Co",
                    "city": "Portland",
                    "state": "",
                    "country": "",
                    "business_category": "Retail",
                    "product_categories": "Women's;Men's;Unisex;Accessories;Clothing;Plus Size",
                }
            ]
        )

        call_command("import_companies", csv_path)

        company = Company.objects.get(name="Audience Cleanup Co")
        assert company.state == "OR"
        assert company.country == "United States"
        assert sorted(company.product_categories.values_list("name", flat=True)) == [
            "Accessories",
            "Clothing",
        ]

    def test_maps_city_aliases_to_major_city(self):
        csv_path = write_csv(
            [
                {
                    "name": "Metro Alias Co",
                    "city": "Gresham",
                    "state": "OR",
                    "country": "United States",
                    "business_category": "Retail",
                }
            ]
        )

        call_command("import_companies", csv_path)

        company = Company.objects.get(name="Metro Alias Co")
        assert company.city == "Portland"

    def test_maps_brooklyn_to_new_york(self):
        csv_path = write_csv(
            [
                {
                    "name": "Borough Alias Co",
                    "city": "Brooklyn",
                    "state": "NY",
                    "country": "United States",
                    "business_category": "Retail",
                }
            ]
        )

        call_command("import_companies", csv_path)

        company = Company.objects.get(name="Borough Alias Co")
        assert company.city == "New York"

    def test_merges_and_removes_editorial_product_categories(self):
        csv_path = write_csv(
            [
                {
                    "name": "Category Cleanup Co",
                    "business_category": "Retail",
                    "product_categories": "Bags & Backpacks;Beauty;Consignment;Groceries;Rugs;Toys",
                }
            ]
        )

        call_command("import_companies", csv_path)

        company = Company.objects.get(name="Category Cleanup Co")
        assert sorted(company.product_categories.values_list("name", flat=True)) == [
            "Accessories",
            "Gifts",
            "Home Goods",
            "Makeup/Skincare",
        ]

    def test_skips_editorially_removed_companies(self):
        csv_path = write_csv(
            [
                {
                    "name": "Soren",
                    "business_category": "Retail",
                }
            ]
        )

        call_command("import_companies", csv_path)

        assert not Company.objects.filter(name="Soren").exists()

    def test_updates_existing_company_by_name(self):
        Company.objects.create(name="Ink & Peat", city="Old City")
        csv_path = write_csv(
            [
                {
                    "name": "Ink & Peat",
                    "description": "Home decor and flower store.",
                    "domain": "inkandpeat.com",
                    "city": "Portland",
                    "state": "OR",
                    "country": "United States",
                    "business_category": "Retail",
                    "product_categories": "Gifts",
                    "vegan_gf_friendly_": "",
                }
            ]
        )

        call_command("import_companies", csv_path)

        company = Company.objects.get(name="Ink & Peat")
        assert company.city == "Portland"
        assert company.website == "https://inkandpeat.com"
        assert company.business_category.name == "Retail"
        assert Company.objects.filter(name="Ink & Peat").count() == 1

    def test_dry_run_does_not_write(self):
        csv_path = write_csv([{"name": "Dry Run Co", "business_category": "Retail"}])

        call_command("import_companies", csv_path, "--dry-run")

        assert not Company.objects.filter(name="Dry Run Co").exists()

    def test_can_optionally_include_private_metrics(self):
        csv_path = write_csv(
            [
                {
                    "name": "Metrics Co",
                    "annualrevenue": "1000000",
                    "numberofemployees": "10",
                    "business_category": "Retail",
                }
            ]
        )

        call_command("import_companies", csv_path, "--include-private-metrics")

        company = Company.objects.get(name="Metrics Co")
        assert company.annual_revenue == 1000000
        assert company.number_of_employees == 10

    def test_can_prune_unused_taxonomies(self):
        stale = BusinessCategory.objects.create(name="Retail;Health/Wellness & Beauty")
        csv_path = write_csv(
            [
                {
                    "name": "Prune Co",
                    "business_category": "Retail",
                }
            ]
        )

        call_command("import_companies", csv_path, "--prune-unused-taxonomies")

        assert not BusinessCategory.objects.filter(pk=stale.pk).exists()


@pytest.mark.django_db
class TestEditorialDescriptionCommand:
    def test_fills_blank_descriptions_and_marks_review(self):
        category = BusinessCategory.objects.create(name="Retail")
        product = ProductCategory.objects.create(name="Accessories")
        company = Company.objects.create(
            name="Editorial Co",
            city="Portland",
            state="OR",
            country="United States",
            business_category=category,
        )
        company.product_categories.add(product)

        call_command("generate_editorial_descriptions")

        company.refresh_from_db()
        assert company.description.startswith(
            "Editorial Co is an independent retail business"
        )
        assert company.needs_editorial_review is True

    def test_does_not_overwrite_by_default(self):
        company = Company.objects.create(
            name="Keep Copy Co",
            description="Human-written description.",
        )

        call_command("generate_editorial_descriptions")

        company.refresh_from_db()
        assert company.description == "Human-written description."
        assert company.needs_editorial_review is False
