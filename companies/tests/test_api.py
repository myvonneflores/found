import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

from companies.models import BusinessCategory, Company, CuisineType, OwnershipMarker, ProductCategory, SustainabilityMarker
from community.models import CuratedList, CuratedListItem
from users.models import BusinessClaim

User = get_user_model()


def build_business_hours():
    return {
        "open_by_week": {
            "monday": [{"start": "08:00", "end": "18:00"}],
            "tuesday": [{"start": "08:00", "end": "18:00"}],
            "wednesday": [{"start": "08:00", "end": "18:00"}],
            "thursday": [{"start": "08:00", "end": "18:00"}],
            "friday": [{"start": "08:00", "end": "18:00"}],
            "saturday": [{"start": "09:00", "end": "14:00"}],
            "sunday": [],
        },
        "open_by_date": {},
    }


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
        assert response.data["claimed_profile"] is None
        assert response.data["listing_origin"] == Company.ListingOrigin.IMPORTED
        assert response.data["is_community_listed"] is False

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

    def test_company_detail_includes_claimed_profile_public_lists(self, api_client, two_companies):
        company = two_companies[0]
        user = User.objects.create_user(
            email="claimed-owner@example.com",
            password="supersecure123",
            account_type=User.AccountType.BUSINESS,
            display_name="North Star Team",
        )
        BusinessClaim.objects.create(
            user=user,
            company=company,
            business_name=company.name,
            business_email=user.email,
            status=BusinessClaim.VerificationStatus.VERIFIED,
        )
        public_list = CuratedList.objects.create(
            user=user,
            title="Neighborhood Staples",
            description="Our favorite nearby spots",
            is_public=True,
        )
        CuratedListItem.objects.create(curated_list=public_list, company=company, position=1)

        response = api_client.get(
            reverse("companies:company-detail", kwargs={"slug": company.slug})
        )

        assert response.status_code == 200
        claimed_profile = response.data["claimed_profile"]
        assert claimed_profile["display_name"] == "North Star Team"
        assert claimed_profile["account_type"] == User.AccountType.BUSINESS
        assert claimed_profile["public_list_count"] == 1
        assert len(claimed_profile["public_lists"]) == 1
        assert claimed_profile["public_lists"][0]["title"] == "Neighborhood Staples"
        assert claimed_profile["public_lists"][0]["item_count"] == 1

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

    def test_filters_by_puerto_rico_include_municipality_aliases(self, api_client, two_companies):
        Company.objects.create(
            name="Island Alias Co",
            city="San Juan",
            state="PR",
            country="Puerto Rico",
        )

        response = api_client.get(reverse("companies:company-list"), {"city": "Puerto Rico"})

        assert response.status_code == 200
        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "Island Alias Co"

    def test_company_apis_serialize_canonical_puerto_rico_city(self, api_client, two_companies):
        company = Company.objects.create(
            name="Island Display Co",
            city="Vieques",
            state="PR",
            country="Puerto Rico",
        )

        list_response = api_client.get(reverse("companies:company-list"))
        detail_response = api_client.get(
            reverse("companies:company-detail", kwargs={"slug": company.slug})
        )

        assert list_response.status_code == 200
        listed_company = next(item for item in list_response.data["results"] if item["slug"] == company.slug)
        assert listed_company["city"] == "Puerto Rico"

        assert detail_response.status_code == 200
        assert detail_response.data["city"] == "Puerto Rico"

    def test_filters_by_business_category(self, api_client, two_companies):
        response = api_client.get(
            reverse("companies:company-list"),
            {"business_category": "Food+Bev"},
        )

        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "North Star Market"

    def test_filters_by_legacy_business_category_alias(self, api_client, two_companies):
        response = api_client.get(
            reverse("companies:company-list"),
            {"business_category": "Food"},
        )

        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "North Star Market"

    def test_business_category_list_collapses_legacy_food_alias(self, api_client):
        BusinessCategory.objects.create(name="Food")
        canonical = BusinessCategory.objects.create(name="Food+Bev")

        response = api_client.get(reverse("companies:business-category-list"))

        assert response.status_code == 200
        assert [item["name"] for item in response.data] == ["Food+Bev"]
        assert response.data[0]["id"] == canonical.id

    def test_filters_by_multi_value_taxonomy(self, api_client, two_companies):
        two_companies[0].product_categories.add(ProductCategory.objects.get(name="Clothing"))

        response = api_client.get(
            reverse("companies:company-list"),
            {"product_categories": "Clothing,Gifts"},
        )

        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "North Star Market"

    def test_filters_by_ownership_markers(self, api_client, two_companies):
        response = api_client.get(
            reverse("companies:company-list"),
            {"ownership_markers": "Woman Owned"},
        )

        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "North Star Market"

    def test_filters_require_all_selected_ownership_markers(self, api_client, two_companies):
        two_companies[0].ownership_markers.add(OwnershipMarker.objects.get(name="BIPOC Owned"))

        response = api_client.get(
            reverse("companies:company-list"),
            {"ownership_markers": "Woman Owned,BIPOC Owned"},
        )

        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "North Star Market"

    def test_filters_require_all_selected_sustainability_markers(self, api_client, two_companies):
        two_companies[0].sustainability_markers.add(SustainabilityMarker.objects.get(name="Vintage Goods"))

        response = api_client.get(
            reverse("companies:company-list"),
            {"sustainability_markers": "Sustainable Products,Vintage Goods"},
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

    def test_search_matches_partial_ownership_marker_terms(self, api_client, two_companies):
        response = api_client.get(reverse("companies:company-list"), {"search": "bipoc"})

        assert response.status_code == 200
        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "Cedar Cloth"

    def test_search_matches_related_taxonomy_metadata(self, api_client, two_companies):
        ethiopian = CuisineType.objects.create(
            name="Ethiopian",
            description="East African cuisine",
        )
        company = two_companies[0]
        company.cuisine_types.add(ethiopian)
        company.sustainability_markers.update(description="Low-waste packaging and refill options")

        cuisine_response = api_client.get(reverse("companies:company-list"), {"search": "east afric"})
        sustainability_response = api_client.get(reverse("companies:company-list"), {"search": "low-waste"})

        assert cuisine_response.status_code == 200
        assert cuisine_response.data["count"] == 1
        assert cuisine_response.data["results"][0]["name"] == "North Star Market"
        assert sustainability_response.status_code == 200
        assert sustainability_response.data["count"] == 1
        assert sustainability_response.data["results"][0]["name"] == "North Star Market"

    def test_search_matches_boolean_marker_aliases(self, api_client, two_companies):
        response = api_client.get(reverse("companies:company-list"), {"search": "vegan"})

        assert response.status_code == 200
        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "North Star Market"

    def test_invalid_detail_slug_returns_404(self, api_client):
        response = api_client.get(
            reverse("companies:company-detail", kwargs={"slug": "missing"})
        )

        assert response.status_code == 404

    def test_community_listed_flag_clears_after_verified_claim(self, api_client):
        company = Company.objects.create(
            name="Neighbor Nook",
            listing_origin=Company.ListingOrigin.COMMUNITY,
            is_published=True,
        )
        user = User.objects.create_user(
            email="owner@example.com",
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

        response = api_client.get(
            reverse("companies:company-detail", kwargs={"slug": company.slug})
        )

        assert response.status_code == 200
        assert response.data["listing_origin"] == Company.ListingOrigin.COMMUNITY
        assert response.data["is_community_listed"] is False


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
        Company.objects.create(name="Island Alias Co", city="Carolina")

        response = api_client.get(reverse("companies:city-option-list"))

        assert response.status_code == 200
        assert response.data == ["Los Angeles", "New York", "Portland", "Puerto Rico", "Seattle"]


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

    def test_partial_patch_without_business_hours_leaves_hours_untouched(self, api_client, two_companies):
        company = two_companies[0]
        company.business_hours = build_business_hours()
        company.business_hours_timezone = "America/Los_Angeles"
        company.save(update_fields=["business_hours", "business_hours_timezone"])
        original_hours = company.business_hours
        user = User.objects.create_user(
            email="hours-untouched@example.com",
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

        response = api_client.patch(
            reverse("companies:company-manage-current"),
            {"description": "Hours unchanged"},
            format="json",
        )

        assert response.status_code == 200
        company.refresh_from_db()
        assert company.business_hours == original_hours
        assert company.business_hours_timezone == "America/Los_Angeles"

    def test_invalid_business_hours_patch_returns_field_errors(self, api_client, two_companies):
        company = two_companies[0]
        user = User.objects.create_user(
            email="hours-invalid@example.com",
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

        response = api_client.patch(
            reverse("companies:company-manage-current"),
            {
                "business_hours": {
                    "open_by_week": {
                        "monday": [{"start": "22:00", "end": "02:00"}],
                        "tuesday": [],
                        "wednesday": [],
                        "thursday": [],
                        "friday": [],
                        "saturday": [],
                        "sunday": [],
                    },
                    "open_by_date": {},
                },
                "business_hours_timezone": "America/Los_Angeles",
            },
            format="json",
        )

        assert response.status_code == 400
        assert "business_hours" in response.data

    def test_patch_hours_without_timezone_returns_timezone_error(self, api_client, two_companies):
        company = two_companies[0]
        user = User.objects.create_user(
            email="hours-missing-timezone@example.com",
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

        response = api_client.patch(
            reverse("companies:company-manage-current"),
            {"business_hours": build_business_hours()},
            format="json",
        )

        assert response.status_code == 400
        assert "business_hours_timezone" in response.data

    def test_managed_business_hours_save_sets_manual_source_metadata(self, api_client, two_companies):
        company = two_companies[0]
        company.business_hours_raw = "Mon-Fri 8am-6pm"
        company.business_hours_source_url = "https://example.com/hours"
        company.business_hours_source = Company.BusinessHoursSource.BULK_IMPORT
        company.save(
            update_fields=["business_hours_raw", "business_hours_source_url", "business_hours_source"]
        )
        user = User.objects.create_user(
            email="hours-manual@example.com",
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

        response = api_client.patch(
            reverse("companies:company-manage-current"),
            {
                "business_hours": build_business_hours(),
                "business_hours_timezone": "America/Los_Angeles",
            },
            format="json",
        )

        assert response.status_code == 200
        company.refresh_from_db()
        assert company.business_hours_source == Company.BusinessHoursSource.OWNER_MANUAL
        assert company.business_hours_source_url == ""
        assert company.business_hours_raw == ""
        assert company.business_hours_last_verified_at is not None

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
        assert claim.company.listing_origin == Company.ListingOrigin.OWNER
        assert claim.company.submitted_by == user
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


@pytest.mark.django_db
class TestCommunityCompanyListingApi:
    def test_personal_user_can_create_community_listing(self, api_client, taxonomy_set):
        user = User.objects.create_user(
            email="reader@example.com",
            password="supersecure123",
            account_type=User.AccountType.PERSONAL,
        )
        api_client.force_authenticate(user=user)

        response = api_client.post(
            reverse("companies:company-community-create"),
            {
                "name": "Corner Pantry",
                "description": "A neighborhood staple.",
                "city": "Portland",
                "state": "OR",
                "business_categories": [taxonomy_set["food"].id],
            },
            format="json",
        )

        assert response.status_code == 201
        company = Company.objects.get(name="Corner Pantry")
        assert company.listing_origin == Company.ListingOrigin.COMMUNITY
        assert company.submitted_by == user
        assert company.is_published is True
        assert company.needs_editorial_review is True
        assert company.business_category == taxonomy_set["food"]
        assert response.data["slug"] == company.slug

    def test_business_user_cannot_create_community_listing(self, api_client):
        user = User.objects.create_user(
            email="owner@example.com",
            password="supersecure123",
            account_type=User.AccountType.BUSINESS,
        )
        api_client.force_authenticate(user=user)

        response = api_client.post(
            reverse("companies:company-community-create"),
            {
                "name": "Corner Pantry",
                "city": "Portland",
                "state": "OR",
            },
            format="json",
        )

        assert response.status_code == 400
        assert "Only personal users can create community business listings." in str(response.data)

    def test_anonymous_user_cannot_create_community_listing(self, api_client):
        response = api_client.post(
            reverse("companies:company-community-create"),
            {
                "name": "Corner Pantry",
                "city": "Portland",
                "state": "OR",
            },
            format="json",
        )

        assert response.status_code == 401

    def test_community_listing_duplicate_check_uses_name_city_state(self, api_client):
        user = User.objects.create_user(
            email="reader@example.com",
            password="supersecure123",
            account_type=User.AccountType.PERSONAL,
        )
        Company.objects.create(
            name="Corner Pantry",
            city="Portland",
            state="OR",
            listing_origin=Company.ListingOrigin.IMPORTED,
        )
        api_client.force_authenticate(user=user)

        response = api_client.post(
            reverse("companies:company-community-create"),
            {
                "name": "Corner Pantry",
                "city": "Portland",
                "state": "OR",
            },
            format="json",
        )

        assert response.status_code == 400
        assert "already exists on FOUND" in str(response.data)
