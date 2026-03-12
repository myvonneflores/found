import csv
import tempfile

from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import BusinessCategory, Company, ProductCategory, SustainabilityMarker


class CompanyModelTests(APITestCase):
    def test_company_generates_unique_slug(self):
        first = Company.objects.create(name="Found Shop")
        second = Company.objects.create(name="Found Shop")

        self.assertEqual(first.slug, "found-shop")
        self.assertEqual(second.slug, "found-shop-2")


class CompanyApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        retail = BusinessCategory.objects.create(name="Retail")
        food = BusinessCategory.objects.create(name="Food")
        clothing = ProductCategory.objects.create(name="Clothing")
        gifts = ProductCategory.objects.create(name="Gifts")
        sustainable = SustainabilityMarker.objects.create(name="Sustainable Products")
        vintage = SustainabilityMarker.objects.create(name="Vintage Goods")

        cls.company_one = Company.objects.create(
            name="North Star Market",
            description="Neighborhood grocery with eco products.",
            city="Portland",
            state="Oregon",
            country="USA",
            founded_year=2018,
            business_category=food,
            is_vegan_friendly=True,
            number_of_employees=12,
        )
        cls.company_one.product_categories.add(gifts)
        cls.company_one.sustainability_markers.add(sustainable)

        cls.company_two = Company.objects.create(
            name="Cedar Cloth",
            description="Independent apparel studio.",
            city="Seattle",
            state="Washington",
            country="USA",
            founded_year=2014,
            business_category=retail,
            is_gf_friendly=True,
            number_of_employees=6,
        )
        cls.company_two.product_categories.add(clothing)
        cls.company_two.sustainability_markers.add(vintage)

    def test_company_list_is_public(self):
        response = self.client.get(reverse("companies:company-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_company_detail_is_public(self):
        response = self.client.get(
            reverse("companies:company-detail", kwargs={"slug": self.company_one.slug})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["slug"], self.company_one.slug)

    def test_filters_by_city(self):
        response = self.client.get(reverse("companies:company-list"), {"city": "Seattle"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Cedar Cloth")

    def test_filters_by_business_category(self):
        response = self.client.get(
            reverse("companies:company-list"),
            {"business_category": "Food"},
        )

        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "North Star Market")

    def test_filters_by_multi_value_taxonomy(self):
        response = self.client.get(
            reverse("companies:company-list"),
            {"product_categories": "Clothing,Gifts"},
        )

        self.assertEqual(response.data["count"], 2)

    def test_search_and_range_filters_can_be_combined(self):
        response = self.client.get(
            reverse("companies:company-list"),
            {
                "search": "independent",
                "employees_min": 5,
                "employees_max": 10,
            },
        )

        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Cedar Cloth")

    def test_invalid_detail_slug_returns_404(self):
        response = self.client.get(reverse("companies:company-detail", kwargs={"slug": "missing"}))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_taxonomy_endpoints_are_public(self):
        response = self.client.get(reverse("companies:business-category-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)


class CompanyImportCommandTests(APITestCase):
    def write_csv(self, rows):
        temp_file = tempfile.NamedTemporaryFile(mode="w", newline="", suffix=".csv", delete=False)
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
                "vegan_gf_friendly_",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)
        temp_file.close()
        return temp_file.name

    def test_import_companies_creates_models_and_taxonomies(self):
        csv_path = self.write_csv(
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
                    "vegan_gf_friendly_": "Vegan Friendly;Gluten Free Friendly",
                }
            ]
        )

        call_command("import_companies", csv_path)

        company = Company.objects.get(name="Blossoming Lotus Cafe")
        self.assertEqual(company.website, "https://blpdx.com")
        self.assertEqual(company.instagram_handle, "blossominglotus")
        self.assertEqual(company.business_category.name, "Food")
        self.assertTrue(company.is_vegan_friendly)
        self.assertTrue(company.is_gf_friendly)
        self.assertIsNone(company.annual_revenue)
        self.assertIsNone(company.number_of_employees)
        self.assertEqual(company.product_categories.count(), 2)
        self.assertEqual(company.sustainability_markers.count(), 2)

    def test_import_companies_normalizes_categories_and_backfills_us_country(self):
        csv_path = self.write_csv(
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
        self.assertEqual(company.business_category.name, "Health/Wellness & Beauty")
        self.assertEqual(company.country, "United States")
        self.assertCountEqual(
            company.product_categories.values_list("name", flat=True),
            ["Makeup/Skincare", "Music/Records"],
        )

    def test_import_companies_drops_audience_labels_and_backfills_portland_state(self):
        csv_path = self.write_csv(
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
        self.assertEqual(company.state, "OR")
        self.assertEqual(company.country, "United States")
        self.assertCountEqual(
            company.product_categories.values_list("name", flat=True),
            ["Accessories", "Clothing"],
        )

    def test_import_companies_merges_and_removes_editorial_product_categories(self):
        csv_path = self.write_csv(
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
        self.assertCountEqual(
            company.product_categories.values_list("name", flat=True),
            ["Accessories", "Makeup/Skincare", "Home Goods", "Gifts"],
        )

    def test_import_companies_skips_editorially_removed_companies(self):
        csv_path = self.write_csv(
            [
                {
                    "name": "Soren",
                    "business_category": "Retail",
                }
            ]
        )

        call_command("import_companies", csv_path)

        self.assertFalse(Company.objects.filter(name="Soren").exists())

    def test_import_companies_updates_existing_company_by_name(self):
        Company.objects.create(name="Ink & Peat", city="Old City")
        csv_path = self.write_csv(
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
        self.assertEqual(company.city, "Portland")
        self.assertEqual(company.website, "https://inkandpeat.com")
        self.assertEqual(company.business_category.name, "Retail")
        self.assertEqual(Company.objects.filter(name="Ink & Peat").count(), 1)

    def test_import_companies_dry_run_does_not_write(self):
        csv_path = self.write_csv([{"name": "Dry Run Co", "business_category": "Retail"}])

        call_command("import_companies", csv_path, "--dry-run")

        self.assertFalse(Company.objects.filter(name="Dry Run Co").exists())

    def test_import_companies_can_optionally_include_private_metrics(self):
        csv_path = self.write_csv(
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
        self.assertEqual(company.annual_revenue, 1000000)
        self.assertEqual(company.number_of_employees, 10)

    def test_import_companies_can_prune_unused_taxonomies(self):
        stale = BusinessCategory.objects.create(name="Retail;Health/Wellness & Beauty")
        csv_path = self.write_csv(
            [
                {
                    "name": "Prune Co",
                    "business_category": "Retail",
                }
            ]
        )

        call_command("import_companies", csv_path, "--prune-unused-taxonomies")

        self.assertFalse(BusinessCategory.objects.filter(pk=stale.pk).exists())
