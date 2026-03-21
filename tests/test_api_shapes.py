"""
API response shape tests — one test per endpoint, asserting exact field sets and types.
These act as a contract: if a serializer field is renamed or removed, the test breaks.
"""

import pytest
from django.urls import reverse

from community.models import CuratedList, SavedCuratedList
from tests.factories import BusinessCategoryFactory, CompanyFactory
from users.models import BusinessClaim, User
from users.models import business_claim_history_table_exists
from tests.factories import UserFactory

TAXONOMY_OBJECT_FIELDS = {"id", "id_hash", "name", "description"}

COMPANY_LIST_FIELDS = {
    "id",
    "id_hash",
    "name",
    "slug",
    "description",
    "listing_origin",
    "is_community_listed",
    "city",
    "state",
    "country",
    "business_category",
    "business_categories",
    "product_categories",
    "ownership_markers",
    "sustainability_markers",
    "is_vegan_friendly",
    "is_gf_friendly",
    "is_published",
}

COMPANY_DETAIL_FIELDS = {
    "id",
    "id_hash",
    "name",
    "slug",
    "description",
    "listing_origin",
    "is_community_listed",
    "cuisine_types",
    "website",
    "founded_year",
    "address",
    "city",
    "state",
    "zip_code",
    "country",
    "business_hours",
    "business_hours_timezone",
    "business_category",
    "business_categories",
    "product_categories",
    "claimed_profile",
    "other_locations",
    "public_recommendations",
    "ownership_markers",
    "sustainability_markers",
    "instagram_handle",
    "facebook_page",
    "linkedin_page",
    "is_vegan_friendly",
    "is_gf_friendly",
    "created_at",
    "updated_at",
    "is_published",
}

MANAGED_COMPANY_FIELDS = {
    "id",
    "slug",
    "name",
    "description",
    "website",
    "address",
    "city",
    "state",
    "zip_code",
    "business_hours",
    "business_hours_timezone",
    "business_category",
    "business_categories",
    "product_categories",
    "cuisine_types",
    "ownership_markers",
    "sustainability_markers",
    "instagram_handle",
    "facebook_page",
    "linkedin_page",
    "is_vegan_friendly",
    "is_gf_friendly",
    "is_published",
}
MANAGED_LOCATION_FIELDS = {
    "id",
    "slug",
    "name",
    "address",
    "city",
    "state",
    "is_published",
}

CLAIMED_PROFILE_FIELDS = {
    "display_name",
    "public_slug",
    "account_type",
    "public_list_count",
    "public_lists",
}

CLAIMED_PUBLIC_LIST_FIELDS = {
    "id",
    "id_hash",
    "title",
    "description",
    "updated_at",
    "item_count",
}
OTHER_LOCATION_FIELDS = {"id", "name", "slug", "address", "city", "state"}
COMPANY_PUBLIC_RECOMMENDATION_FIELDS = {"id", "id_hash", "title", "body", "created_at", "updated_at"}
PUBLIC_LIST_OWNER_FIELDS = {"display_name", "public_slug", "account_type"}
PUBLIC_LIST_PREVIEW_COMPANY_FIELDS = {"id", "slug", "name", "city", "state", "country"}
PUBLIC_LIST_PREVIEW_FIELDS = {
    "id",
    "id_hash",
    "title",
    "description",
    "updated_at",
    "item_count",
    "owner",
    "preview_companies",
}
SAVED_LIST_FIELDS = {"id", "created_at", "list"}
COMPANY_DOMAIN_MATCH_FIELDS = {"matched", "companies"}
COMPANY_DOMAIN_MATCH_COMPANY_FIELDS = {"id", "name", "slug", "address", "city", "state"}

USER_FIELDS = {"id", "email", "first_name", "last_name", "account_type", "public_slug", "verification_status", "display_name", "needs_display_name_review", "is_business_verified", "onboarding_completed", "badges"}
DISPLAY_NAME_AVAILABILITY_FIELDS = {"available", "suggestions"}
BUSINESS_CLAIM_LIST_FIELDS = {
    "id",
    "company",
    "company_name",
    "company_slug",
    "intent",
    "status",
    "business_name",
    "submitter_first_name",
    "submitter_last_name",
    "business_email",
    "business_phone",
    "website",
    "instagram_handle",
    "facebook_page",
    "linkedin_page",
    "role_title",
    "claim_message",
    "decision_reason_code",
    "decision_reason_label",
    "review_checklist",
    "review_checklist_labels",
    "review_notes",
    "resubmitted_at",
    "resubmission_count",
    "submitted_at",
    "reviewed_at",
}
BUSINESS_CLAIM_DETAIL_FIELDS = {
    *BUSINESS_CLAIM_LIST_FIELDS,
    "history",
}
BUSINESS_CLAIM_HISTORY_FIELDS = {
    "event_type",
    "event_label",
    "actor_display",
    "occurred_at",
    "metadata",
}

# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_healthcheck_response_shape(api_client):
    response = api_client.get(reverse("healthcheck"))

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# Companies
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_company_list_paginated_envelope(api_client):
    response = api_client.get(reverse("companies:company-list"))

    assert response.status_code == 200
    data = response.json()
    assert set(data.keys()) == {"count", "next", "previous", "results"}
    assert isinstance(data["count"], int)
    assert isinstance(data["results"], list)


@pytest.mark.django_db
def test_company_list_result_fields(api_client):
    CompanyFactory()

    response = api_client.get(reverse("companies:company-list"))

    item = response.json()["results"][0]
    assert set(item.keys()) == COMPANY_LIST_FIELDS
    assert isinstance(item["id"], int)
    assert isinstance(item["id_hash"], str) and len(item["id_hash"]) == 8
    assert isinstance(item["name"], str)
    assert isinstance(item["slug"], str)
    assert isinstance(item["listing_origin"], str)
    assert isinstance(item["is_community_listed"], bool)
    # business_category is a plain string (SerializerMethodField) or null
    assert item["business_category"] is None or isinstance(item["business_category"], str)
    # M2M fields are lists of strings (StringRelatedField)
    for field in ("business_categories", "product_categories", "ownership_markers", "sustainability_markers"):
        assert isinstance(item[field], list)
        for val in item[field]:
            assert isinstance(val, str)
    assert isinstance(item["is_vegan_friendly"], bool)
    assert isinstance(item["is_gf_friendly"], bool)


@pytest.mark.django_db
def test_company_domain_match_response_shape(api_client):
    response = api_client.get(
        reverse("companies:company-domain-match"),
        {"website": "https://unknown.example"},
    )

    assert response.status_code == 200
    data = response.json()
    assert set(data.keys()) == COMPANY_DOMAIN_MATCH_FIELDS
    assert isinstance(data["matched"], bool)
    assert isinstance(data["companies"], list)


@pytest.mark.django_db
def test_company_detail_fields(api_client):
    company = CompanyFactory()

    response = api_client.get(
        reverse("companies:company-detail", kwargs={"slug": company.slug})
    )

    assert response.status_code == 200
    data = response.json()
    assert set(data.keys()) == COMPANY_DETAIL_FIELDS
    assert isinstance(data["listing_origin"], str)
    assert isinstance(data["is_community_listed"], bool)
    assert "business_hours_raw" not in data
    assert "business_hours_source" not in data
    assert "business_hours_source_url" not in data
    assert "business_hours_last_verified_at" not in data
    assert data["business_hours"] is None or isinstance(data["business_hours"], dict)
    assert data["business_hours_timezone"] is None or isinstance(data["business_hours_timezone"], str)
    # business_category is a nested taxonomy object
    if data["business_category"] is not None:
        assert set(data["business_category"].keys()) == TAXONOMY_OBJECT_FIELDS
    # M2M fields are lists of nested taxonomy objects
    for field in ("business_categories", "product_categories", "cuisine_types", "ownership_markers", "sustainability_markers"):
        assert isinstance(data[field], list)
        for obj in data[field]:
            assert set(obj.keys()) == TAXONOMY_OBJECT_FIELDS
    if data["claimed_profile"] is not None:
        assert set(data["claimed_profile"].keys()) == CLAIMED_PROFILE_FIELDS
        assert isinstance(data["claimed_profile"]["display_name"], str)
        assert isinstance(data["claimed_profile"]["public_slug"], str)
        assert isinstance(data["claimed_profile"]["account_type"], str)
        assert isinstance(data["claimed_profile"]["public_list_count"], int)
        assert isinstance(data["claimed_profile"]["public_lists"], list)
        for item in data["claimed_profile"]["public_lists"]:
            assert set(item.keys()) == CLAIMED_PUBLIC_LIST_FIELDS
            assert isinstance(item["id"], int)
            assert isinstance(item["id_hash"], str)
            assert isinstance(item["title"], str)
            assert isinstance(item["description"], str)
            assert isinstance(item["updated_at"], str)
            assert isinstance(item["item_count"], int)
    assert isinstance(data["other_locations"], list)
    for item in data["other_locations"]:
        assert set(item.keys()) == OTHER_LOCATION_FIELDS
        assert isinstance(item["id"], int)
        assert isinstance(item["name"], str)
        assert isinstance(item["slug"], str)
        assert isinstance(item["address"], str)
        assert isinstance(item["city"], str)
        assert isinstance(item["state"], str)
    assert isinstance(data["public_recommendations"], list)
    for item in data["public_recommendations"]:
        assert set(item.keys()) == COMPANY_PUBLIC_RECOMMENDATION_FIELDS
        assert isinstance(item["id"], int)
        assert isinstance(item["id_hash"], str)
        assert isinstance(item["title"], str)
        assert isinstance(item["body"], str)
        assert isinstance(item["created_at"], str)
        assert isinstance(item["updated_at"], str)
    # Timestamps are ISO-format strings
    assert isinstance(data["created_at"], str)
    assert isinstance(data["updated_at"], str)


@pytest.mark.django_db
def test_managed_company_fields(api_client):
    company = CompanyFactory()
    user = User.objects.create_user(
        email="managed-shape@example.com",
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

    response = api_client.get(reverse("companies:company-manage-current"))

    assert response.status_code == 200
    data = response.json()
    assert set(data.keys()) == MANAGED_COMPANY_FIELDS
    assert "business_hours_raw" not in data
    assert "business_hours_source" not in data
    assert "business_hours_source_url" not in data
    assert "business_hours_last_verified_at" not in data
    assert data["business_hours"] is None or isinstance(data["business_hours"], dict)
    assert data["business_hours_timezone"] is None or isinstance(data["business_hours_timezone"], str)


@pytest.mark.django_db
def test_managed_location_list_fields(api_client):
    company = CompanyFactory()
    user = User.objects.create_user(
        email="managed-locations@example.com",
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

    response = api_client.get(reverse("companies:company-manage-location-list"))

    assert response.status_code == 200
    payload = response.json()
    data = payload[0] if isinstance(payload, list) else payload["results"][0]
    assert set(data.keys()) == MANAGED_LOCATION_FIELDS
    assert isinstance(data["id"], int)
    assert isinstance(data["slug"], str)
    assert isinstance(data["name"], str)
    assert isinstance(data["address"], str)
    assert isinstance(data["city"], str)
    assert isinstance(data["state"], str)
    assert isinstance(data["is_published"], bool)


@pytest.mark.django_db
def test_company_detail_404_shape(api_client):
    response = api_client.get(
        reverse("companies:company-detail", kwargs={"slug": "does-not-exist"})
    )

    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert isinstance(data["detail"], str)


# ---------------------------------------------------------------------------
# Taxonomy endpoints (parametrized — same shape for all four)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
@pytest.mark.parametrize(
    "url_name",
    [
        "companies:business-category-list",
        "companies:product-category-list",
        "companies:ownership-marker-list",
        "companies:sustainability-marker-list",
    ],
)
def test_taxonomy_endpoint_response_shape(api_client, url_name):
    # Need at least one object so the list is non-empty
    BusinessCategoryFactory()

    response = api_client.get(reverse(url_name))

    assert response.status_code == 200
    data = response.json()
    # Bare list — no pagination wrapper
    assert isinstance(data, list)


@pytest.mark.django_db
def test_taxonomy_item_fields(api_client):
    BusinessCategoryFactory(name="Shape Test Category")

    response = api_client.get(reverse("companies:business-category-list"))

    item = response.json()[0]
    assert set(item.keys()) == TAXONOMY_OBJECT_FIELDS
    assert isinstance(item["id"], int)
    assert isinstance(item["id_hash"], str) and len(item["id_hash"]) == 8
    assert isinstance(item["name"], str)


@pytest.mark.django_db
def test_business_claim_list_fields(api_client):
    user = UserFactory(account_type=User.AccountType.BUSINESS)
    company = CompanyFactory()
    claim = BusinessClaim.objects.create(
        user=user,
        company=company,
        intent=BusinessClaim.ClaimIntent.EXISTING,
        business_name=company.name,
        submitter_first_name="Owner",
        submitter_last_name="One",
        business_email="owner@shapeclaim.co",
        role_title="Founder",
    )
    api_client.force_authenticate(user=user)

    response = api_client.get(reverse("users:business-claim-list"))

    assert response.status_code == 200
    item = response.json()["results"][0]
    assert set(item.keys()) == BUSINESS_CLAIM_LIST_FIELDS
    assert "history" not in item


@pytest.mark.django_db
def test_business_claim_detail_fields(api_client):
    user = UserFactory(account_type=User.AccountType.BUSINESS)
    company = CompanyFactory()
    claim = BusinessClaim.objects.create(
        user=user,
        company=company,
        intent=BusinessClaim.ClaimIntent.EXISTING,
        business_name=company.name,
        submitter_first_name="Owner",
        submitter_last_name="Detail",
        business_email="owner@shapeclaimdetail.co",
        role_title="Founder",
    )
    history_event = claim.append_history_event("submitted", actor=user)
    api_client.force_authenticate(user=user)

    response = api_client.get(reverse("users:business-claim-detail", kwargs={"pk": claim.pk}))

    assert response.status_code == 200
    item = response.json()
    assert set(item.keys()) == BUSINESS_CLAIM_DETAIL_FIELDS
    assert isinstance(item["history"], list)
    if business_claim_history_table_exists() and history_event is not None:
        assert set(item["history"][0].keys()) == BUSINESS_CLAIM_HISTORY_FIELDS
    else:
        assert item["history"] == []


# ---------------------------------------------------------------------------
# Cities
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_cities_endpoint_response_shape(api_client):
    CompanyFactory(city="Portland")
    CompanyFactory(city="Seattle")

    response = api_client.get(reverse("companies:city-option-list"))

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    for city in data:
        assert isinstance(city, str)
    # Cities are sorted
    assert data == sorted(data)


# ---------------------------------------------------------------------------
# Auth — token obtain, refresh, verify
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_token_obtain_response_shape(api_client, user):
    response = api_client.post(
        reverse("token_obtain_pair"),
        {"email": user.email, "password": "testpass123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert set(data.keys()) == {"access", "refresh", "user"}
    assert isinstance(data["access"], str)
    assert isinstance(data["refresh"], str)


@pytest.mark.django_db
def test_token_obtain_invalid_credentials_shape(api_client):
    response = api_client.post(
        reverse("token_obtain_pair"),
        {"email": "nobody@example.com", "password": "wrong"},
    )

    assert response.status_code == 401
    data = response.json()
    assert "detail" in data


@pytest.mark.django_db
def test_token_refresh_response_shape(api_client, user):
    obtain = api_client.post(
        reverse("token_obtain_pair"),
        {"email": user.email, "password": "testpass123"},
    )
    refresh_token = obtain.json()["refresh"]

    response = api_client.post(reverse("token_refresh"), {"refresh": refresh_token})

    assert response.status_code == 200
    data = response.json()
    assert "access" in data
    assert isinstance(data["access"], str)


@pytest.mark.django_db
def test_token_verify_accepts_valid_token(api_client, user):
    obtain = api_client.post(
        reverse("token_obtain_pair"),
        {"email": user.email, "password": "testpass123"},
    )
    access_token = obtain.json()["access"]

    response = api_client.post(reverse("token_verify"), {"token": access_token})

    assert response.status_code == 200


# ---------------------------------------------------------------------------
# User registration
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_register_response_shape(api_client):
    response = api_client.post(
        reverse("users:register"),
        {
            "email": "newuser@example.com",
            "password": "strongpass123",
            "first_name": "Test",
            "last_name": "User",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert isinstance(data["id"], int)
    assert data["email"] == "newuser@example.com"
    # write_only field must never appear in the response
    assert "password" not in data


@pytest.mark.django_db
def test_register_validation_error_shape(api_client):
    response = api_client.post(
        reverse("users:register"),
        {"email": "not-an-email", "password": "short"},
    )

    assert response.status_code == 400
    data = response.json()
    # DRF validation errors: {field_name: [error_string, ...]}
    assert isinstance(data, dict)
    for key, value in data.items():
        assert isinstance(value, list)
        for msg in value:
            assert isinstance(msg, str)


@pytest.mark.django_db
def test_display_name_availability_response_shape(api_client):
    response = api_client.get(
        reverse("users:display-name-availability"),
        {"display_name": "Reader One"},
    )

    assert response.status_code == 200
    data = response.json()
    assert set(data.keys()) == DISPLAY_NAME_AVAILABILITY_FIELDS
    assert isinstance(data["available"], bool)
    assert isinstance(data["suggestions"], list)
    for suggestion in data["suggestions"]:
        assert isinstance(suggestion, str)


# ---------------------------------------------------------------------------
# User me
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_me_response_shape(authenticated_client):
    response = authenticated_client.get(reverse("users:me"))

    assert response.status_code == 200
    data = response.json()
    assert set(data.keys()) == USER_FIELDS
    assert isinstance(data["badges"], list)
    assert isinstance(data["needs_display_name_review"], bool)


@pytest.mark.django_db
def test_me_requires_auth(api_client):
    response = api_client.get(reverse("users:me"))

    assert response.status_code == 401


@pytest.mark.django_db
def test_me_401_response_shape(api_client):
    response = api_client.get(reverse("users:me"))

    data = response.json()
    assert "detail" in data
    assert isinstance(data["detail"], str)


# ---------------------------------------------------------------------------
# Community
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_public_list_search_response_shape(api_client):
    owner = UserFactory(display_name="Reader One")
    curated_list = CuratedList.objects.create(
        user=owner,
        title="Weekend favorites",
        description="Neighborhood staples",
        is_public=True,
    )
    curated_list.items.create(company=CompanyFactory(name="North Star Market"), position=1)

    response = api_client.get(reverse("community:public-list-list"))

    assert response.status_code == 200
    data = response.json()
    assert set(data.keys()) == {"count", "next", "previous", "results"}
    assert isinstance(data["results"], list)
    item = data["results"][0]
    assert set(item.keys()) == PUBLIC_LIST_PREVIEW_FIELDS
    assert set(item["owner"].keys()) == PUBLIC_LIST_OWNER_FIELDS
    assert isinstance(item["preview_companies"], list)
    assert set(item["preview_companies"][0].keys()) == PUBLIC_LIST_PREVIEW_COMPANY_FIELDS


@pytest.mark.django_db
def test_saved_list_response_shape(authenticated_client, user):
    owner = UserFactory(display_name="Reader One")
    curated_list = CuratedList.objects.create(
        user=owner,
        title="Weekend favorites",
        description="Neighborhood staples",
        is_public=True,
    )
    curated_list.items.create(company=CompanyFactory(name="North Star Market"), position=1)
    SavedCuratedList.objects.create(user=user, curated_list=curated_list)

    response = authenticated_client.get(reverse("community:saved-list-list"))

    assert response.status_code == 200
    data = response.json()
    assert set(data.keys()) == {"count", "next", "previous", "results"}
    assert isinstance(data["results"], list)
    item = data["results"][0]
    assert set(item.keys()) == SAVED_LIST_FIELDS
    assert set(item["list"].keys()) == PUBLIC_LIST_PREVIEW_FIELDS
