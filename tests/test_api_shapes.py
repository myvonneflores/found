"""
API response shape tests — one test per endpoint, asserting exact field sets and types.
These act as a contract: if a serializer field is renamed or removed, the test breaks.
"""

import pytest
from django.urls import reverse

from tests.factories import BusinessCategoryFactory, CompanyFactory

TAXONOMY_OBJECT_FIELDS = {"id", "id_hash", "name", "description"}

COMPANY_LIST_FIELDS = {
    "id",
    "id_hash",
    "name",
    "slug",
    "description",
    "city",
    "state",
    "country",
    "business_category",
    "product_categories",
    "ownership_markers",
    "sustainability_markers",
    "is_vegan_friendly",
    "is_gf_friendly",
}

COMPANY_DETAIL_FIELDS = {
    "id",
    "id_hash",
    "name",
    "slug",
    "description",
    "website",
    "founded_year",
    "address",
    "city",
    "state",
    "zip_code",
    "country",
    "business_category",
    "product_categories",
    "ownership_markers",
    "sustainability_markers",
    "instagram_handle",
    "facebook_page",
    "linkedin_page",
    "is_vegan_friendly",
    "is_gf_friendly",
    "created_at",
    "updated_at",
}

USER_FIELDS = {"id", "email", "first_name", "last_name"}


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
    # business_category is a plain string (SerializerMethodField) or null
    assert item["business_category"] is None or isinstance(item["business_category"], str)
    # M2M fields are lists of strings (StringRelatedField)
    for field in ("product_categories", "ownership_markers", "sustainability_markers"):
        assert isinstance(item[field], list)
        for val in item[field]:
            assert isinstance(val, str)
    assert isinstance(item["is_vegan_friendly"], bool)
    assert isinstance(item["is_gf_friendly"], bool)


@pytest.mark.django_db
def test_company_detail_fields(api_client):
    company = CompanyFactory()

    response = api_client.get(
        reverse("companies:company-detail", kwargs={"slug": company.slug})
    )

    assert response.status_code == 200
    data = response.json()
    assert set(data.keys()) == COMPANY_DETAIL_FIELDS
    # business_category is a nested taxonomy object
    if data["business_category"] is not None:
        assert set(data["business_category"].keys()) == TAXONOMY_OBJECT_FIELDS
    # M2M fields are lists of nested taxonomy objects
    for field in ("product_categories", "ownership_markers", "sustainability_markers"):
        assert isinstance(data[field], list)
        for obj in data[field]:
            assert set(obj.keys()) == TAXONOMY_OBJECT_FIELDS
    # Timestamps are ISO-format strings
    assert isinstance(data["created_at"], str)
    assert isinstance(data["updated_at"], str)


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
    assert isinstance(item["description"], str)


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
    assert set(data.keys()) == {"access", "refresh"}
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
    assert set(data.keys()) == USER_FIELDS
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


# ---------------------------------------------------------------------------
# User me
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_me_response_shape(authenticated_client):
    response = authenticated_client.get(reverse("users:me"))

    assert response.status_code == 200
    data = response.json()
    assert set(data.keys()) == USER_FIELDS


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
