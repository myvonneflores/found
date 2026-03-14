import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


@pytest.fixture
def api_client():
    """Unauthenticated DRF test client."""
    return APIClient()


@pytest.fixture
def user(db):
    """A single persisted user."""
    from tests.factories import UserFactory

    return UserFactory()


@pytest.fixture
def authenticated_client(api_client, user):
    """APIClient with JWT Authorization header."""
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client
