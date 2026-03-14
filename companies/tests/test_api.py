import pytest
from django.urls import reverse

from companies.models import Company


@pytest.mark.django_db
class TestCompanyListApi:
    def test_company_list_is_public(self, api_client, two_companies):
        response = api_client.get(reverse("companies:company-list"))

        assert response.status_code == 200
        assert response.data["count"] == 2

    def test_company_detail_is_public(self, api_client, two_companies):
        company = two_companies[0]
        response = api_client.get(
            reverse("companies:company-detail", kwargs={"slug": company.slug})
        )

        assert response.status_code == 200
        assert response.data["slug"] == company.slug

    def test_filters_by_city(self, api_client, two_companies):
        response = api_client.get(reverse("companies:company-list"), {"city": "Seattle"})

        assert response.status_code == 200
        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "Cedar Cloth"

    def test_filters_by_canonical_city_include_aliases(self, api_client, two_companies):
        Company.objects.create(
            name="Metro Alias Co",
            city="Gresham",
            state="OR",
            country="United States",
        )

        response = api_client.get(reverse("companies:company-list"), {"city": "Portland"})

        assert response.status_code == 200
        assert response.data["count"] == 2
        names = [c["name"] for c in response.data["results"]]
        assert sorted(names) == sorted(["North Star Market", "Metro Alias Co"])

    def test_filters_by_new_york_include_brooklyn_aliases(self, api_client, two_companies):
        Company.objects.create(
            name="Borough Alias Co",
            city="Brooklyn",
            state="NY",
            country="United States",
        )

        response = api_client.get(reverse("companies:company-list"), {"city": "New York"})

        assert response.status_code == 200
        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "Borough Alias Co"

    def test_filters_by_business_category(self, api_client, two_companies):
        response = api_client.get(
            reverse("companies:company-list"),
            {"business_category": "Food"},
        )

        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "North Star Market"

    def test_filters_by_multi_value_taxonomy(self, api_client, two_companies):
        response = api_client.get(
            reverse("companies:company-list"),
            {"product_categories": "Clothing,Gifts"},
        )

        assert response.data["count"] == 2

    def test_filters_by_ownership_markers(self, api_client, two_companies):
        response = api_client.get(
            reverse("companies:company-list"),
            {"ownership_markers": "Woman Owned"},
        )

        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "North Star Market"

    def test_search_and_range_filters_can_be_combined(self, api_client, two_companies):
        response = api_client.get(
            reverse("companies:company-list"),
            {
                "search": "independent",
                "employees_min": 5,
                "employees_max": 10,
            },
        )

        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "Cedar Cloth"

    def test_invalid_detail_slug_returns_404(self, api_client):
        response = api_client.get(
            reverse("companies:company-detail", kwargs={"slug": "missing"})
        )

        assert response.status_code == 404


@pytest.mark.django_db
class TestTaxonomyAndCityApis:
    def test_taxonomy_endpoints_are_public(self, api_client, taxonomy_set):
        response = api_client.get(reverse("companies:business-category-list"))
        assert response.status_code == 200
        assert len(response.data) == 2

        response = api_client.get(reverse("companies:ownership-marker-list"))
        assert response.status_code == 200
        assert len(response.data) == 2

    def test_city_options_returns_canonical_cities(self, api_client, two_companies):
        response = api_client.get(reverse("companies:city-option-list"))

        assert response.status_code == 200
        assert response.data == ["Portland", "Seattle"]

    def test_city_options_collapses_aliases(self, api_client, two_companies):
        Company.objects.create(name="Metro Alias Co", city="Gresham")
        Company.objects.create(name="Borough Alias Co", city="Brooklyn")
        Company.objects.create(name="Neighborhood Alias Co", city="West Hollywood")

        response = api_client.get(reverse("companies:city-option-list"))

        assert response.status_code == 200
        assert response.data == ["Los Angeles", "New York", "Portland", "Seattle"]
