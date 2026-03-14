from django.urls import include, path
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView,
)

from core.views import healthcheck
from users.views import CustomTokenObtainPairView

urlpatterns = [
    path("health/", healthcheck, name="healthcheck"),
    path("auth/token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("", include("companies.urls")),
    path("community/", include("community.urls")),
    path("users/", include("users.urls")),
]
