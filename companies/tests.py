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
