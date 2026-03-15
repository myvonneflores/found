import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model

from companies.models import Company
from users.models import BusinessClaim

User = get_user_model()


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

    def test_company_detail_includes_boolean_markers_in_sustainability_markers(self, api_client, two_companies):
        first_company = two_companies[0]
        second_company = two_companies[1]

        first_response = api_client.get(
            reverse("companies:company-detail", kwargs={"slug": first_company.slug})
        )
        second_response = api_client.get(
            reverse("companies:company-detail", kwargs={"slug": second_company.slug})
        )

        assert first_response.status_code == 200
        assert second_response.status_code == 200
        first_marker_names = [item["name"] for item in first_response.data["sustainability_markers"]]
        second_marker_names = [item["name"] for item in second_response.data["sustainability_markers"]]
        assert "Vegan-friendly" in first_marker_names
        assert "Gluten-free-friendly" not in first_marker_names
        assert "Gluten-free-friendly" in second_marker_names

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


@pytest.mark.django_db
class TestManagedBusinessProfileApi:
    def test_verified_business_user_can_get_and_update_managed_company(self, api_client, two_companies):
        company = two_companies[0]
        user = User.objects.create_user(
            email="verified-business@example.com",
            password="supersecure123",
            account_type=User.AccountType.BUSINESS,
        )
        BusinessClaim.objects.create(
            user=user,
            company=company,
            business_name=company.name,
            business_email=user.email,
            status=BusinessClaim.VerificationStatus.VERIFIED,
        )
        api_client.force_authenticate(user=user)

        get_response = api_client.get(reverse("companies:company-manage-current"))

        assert get_response.status_code == 200
        assert get_response.data["name"] == company.name

        patch_response = api_client.patch(
            reverse("companies:company-manage-current"),
            {"description": "Fresh profile copy", "city": "Portland", "state": "OR"},
        )

        assert patch_response.status_code == 200
        company.refresh_from_db()
        assert company.description == "Fresh profile copy"
        assert company.city == "Portland"
        assert company.state == "OR"

    def test_pending_business_user_cannot_manage_company(self, api_client, two_companies):
        company = two_companies[0]
        user = User.objects.create_user(
            email="pending-business@example.com",
            password="supersecure123",
            account_type=User.AccountType.BUSINESS,
        )
        BusinessClaim.objects.create(
            user=user,
            company=company,
            business_name=company.name,
            business_email=user.email,
            status=BusinessClaim.VerificationStatus.PENDING,
        )
        api_client.force_authenticate(user=user)

        response = api_client.get(reverse("companies:company-manage-current"))

        assert response.status_code == 403

    def test_verified_business_user_can_create_managed_company_when_claim_has_no_company(
        self, api_client, taxonomy_set
    ):
        user = User.objects.create_user(
            email="new-business@example.com",
            password="supersecure123",
            account_type=User.AccountType.BUSINESS,
        )
        claim = BusinessClaim.objects.create(
            user=user,
            business_name="Fresh Company",
            business_email=user.email,
            status=BusinessClaim.VerificationStatus.VERIFIED,
        )
        api_client.force_authenticate(user=user)

        response = api_client.post(
            reverse("companies:company-manage-current"),
            {
                "name": "Fresh Company",
                "description": "A brand-new company profile.",
                "city": "Portland",
                "state": "OR",
            },
            format="json",
        )

        assert response.status_code == 201
        claim.refresh_from_db()
        assert claim.company is not None
        assert claim.company.name == "Fresh Company"
        assert response.data["slug"] == claim.company.slug

    def test_managed_company_create_sets_primary_category_from_business_categories(
        self, api_client, taxonomy_set
    ):
        user = User.objects.create_user(
            email="categorized-business@example.com",
            password="supersecure123",
            account_type=User.AccountType.BUSINESS,
        )
        claim = BusinessClaim.objects.create(
            user=user,
            business_name="Categorized Company",
            business_email=user.email,
            status=BusinessClaim.VerificationStatus.VERIFIED,
        )
        retail = taxonomy_set["retail"]
        food = taxonomy_set["food"]
        api_client.force_authenticate(user=user)

        response = api_client.post(
            reverse("companies:company-manage-current"),
            {
                "name": "Categorized Company",
                "business_categories": [retail.id, food.id],
                "city": "Portland",
                "state": "OR",
            },
            format="json",
        )

        assert response.status_code == 201
        claim.refresh_from_db()
        assert claim.company is not None
        assert claim.company.business_category == retail
        assert list(claim.company.business_categories.order_by("id").values_list("id", flat=True)) == [
            retail.id,
            food.id,
        ]

    def test_verified_business_user_post_returns_existing_company_if_already_linked(self, api_client, two_companies):
        company = two_companies[0]
        user = User.objects.create_user(
            email="existing-business@example.com",
            password="supersecure123",
            account_type=User.AccountType.BUSINESS,
        )
        BusinessClaim.objects.create(
            user=user,
            company=company,
            business_name=company.name,
            business_email=user.email,
            status=BusinessClaim.VerificationStatus.VERIFIED,
        )
        api_client.force_authenticate(user=user)

        response = api_client.post(
            reverse("companies:company-manage-current"),
            {
                "name": "Ignored Name",
                "description": "Ignored",
            },
            format="json",
        )

        assert response.status_code == 200
        assert response.data["slug"] == company.slug
