from django.contrib.auth import get_user_model
from django.db import models
from django.db.models.functions import Coalesce
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import BusinessClaim, PersonalProfile
from .serializers import (
    BusinessClaimSerializer,
    BusinessClaimSummarySerializer,
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
        profile, _ = PersonalProfile.objects.get_or_create(user=self.request.user)
        return profile


class BusinessClaimListCreateView(generics.ListCreateAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        if self.request.user.account_type != User.AccountType.BUSINESS:
            raise PermissionDenied("Only business users can access business claims.")
        return (
            BusinessClaim.objects.filter(user=self.request.user)
            .select_related("company", "reviewed_by")
            .annotate(current_activity_at=Coalesce("resubmitted_at", "submitted_at"))
            .order_by("-current_activity_at", "-pk")
        )

    def get_serializer_class(self):
        if self.request.method in permissions.SAFE_METHODS:
            return BusinessClaimSummarySerializer
        return BusinessClaimSerializer


class BusinessClaimDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        if self.request.user.account_type != User.AccountType.BUSINESS:
            raise PermissionDenied("Only business users can access business claims.")
        return (
            BusinessClaim.objects.filter(user=self.request.user)
            .select_related("company", "reviewed_by")
            .prefetch_related("history__actor")
        )

    def get_serializer_class(self):
        if self.request.method in permissions.SAFE_METHODS:
            return BusinessClaimSerializer
        return BusinessClaimUpdateSerializer

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        instance = self.get_object()
        response.data = BusinessClaimSerializer(
            instance,
            context=self.get_serializer_context(),
        ).data
        return response


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
