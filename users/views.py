from django.contrib.auth import get_user_model
from django.db import models
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import BusinessClaim, PersonalProfile
from .serializers import (
    BusinessClaimSerializer,
    BusinessClaimUpdateSerializer,
    CustomTokenObtainPairSerializer,
    PersonalProfileSerializer,
    PublicProfileSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user


class PersonalProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = PersonalProfileSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        if self.request.user.account_type != User.AccountType.PERSONAL:
            raise PermissionDenied("Only personal users have personal profiles.")
        profile, _ = PersonalProfile.objects.get_or_create(user=self.request.user)
        return profile


class BusinessClaimListCreateView(generics.ListCreateAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        if self.request.user.account_type != User.AccountType.BUSINESS:
            raise PermissionDenied("Only business users can access business claims.")
        return BusinessClaim.objects.filter(user=self.request.user).select_related("company")

    serializer_class = BusinessClaimSerializer


class BusinessClaimDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        if self.request.user.account_type != User.AccountType.BUSINESS:
            raise PermissionDenied("Only business users can access business claims.")
        return BusinessClaim.objects.filter(user=self.request.user).select_related("company")

    def get_serializer_class(self):
        if self.request.method in permissions.SAFE_METHODS:
            return BusinessClaimSerializer
        return BusinessClaimUpdateSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class PublicProfileDetailView(generics.RetrieveAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = PublicProfileSerializer
    lookup_field = "public_slug"

    def get_queryset(self):
        return (
            User.objects.select_related("personal_profile")
            .prefetch_related("curated_lists__items__company", "recommendations__company")
            .filter(
                models.Q(personal_profile__is_public=True)
                | models.Q(curated_lists__is_public=True)
                | models.Q(recommendations__is_public=True)
            )
            .distinct()
        )
