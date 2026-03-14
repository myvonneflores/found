from django.db import transaction
from django.db.models import F
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from .models import CuratedList, CuratedListItem, Favorite, Recommendation
from .serializers import (
    CuratedListItemCreateSerializer,
    CuratedListItemSerializer,
    CuratedListItemUpdateSerializer,
    CuratedListSerializer,
    FavoriteSerializer,
    PublicCuratedListSerializer,
    PublicRecommendationSerializer,
    RecommendationSerializer,
)


class CommunityAccessMixin:
    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if not request.user.can_use_community_features:
            raise PermissionDenied("Your account is not eligible for community features yet.")


class FavoriteListCreateView(CommunityAccessMixin, generics.ListCreateAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = FavoriteSerializer

    def get_queryset(self):
        return (
            Favorite.objects.filter(user=self.request.user)
            .select_related("company", "company__business_category")
            .prefetch_related(
                "company__product_categories",
                "company__ownership_markers",
                "company__sustainability_markers",
            )
        )


class FavoriteDetailView(CommunityAccessMixin, generics.DestroyAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user)


class CuratedListListCreateView(CommunityAccessMixin, generics.ListCreateAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = CuratedListSerializer

    def get_queryset(self):
        return (
            CuratedList.objects.filter(user=self.request.user)
            .prefetch_related(
                "items__company__product_categories",
                "items__company__ownership_markers",
                "items__company__sustainability_markers",
            )
            .select_related("user")
        )


class CuratedListDetailView(CommunityAccessMixin, generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = CuratedListSerializer

    def get_queryset(self):
        return (
            CuratedList.objects.filter(user=self.request.user)
            .prefetch_related(
                "items__company__product_categories",
                "items__company__ownership_markers",
                "items__company__sustainability_markers",
            )
            .select_related("user")
        )


class CuratedListByHashDetailView(CommunityAccessMixin, generics.RetrieveAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = PublicCuratedListSerializer
    lookup_field = "id_hash"

    def get_queryset(self):
        return (
            CuratedList.objects.filter(user=self.request.user)
            .prefetch_related(
                "items__company__product_categories",
                "items__company__ownership_markers",
                "items__company__sustainability_markers",
            )
            .select_related("user")
        )


class CuratedListItemCreateView(CommunityAccessMixin, generics.CreateAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = CuratedListItemCreateSerializer

    def perform_create(self, serializer):
        curated_list = generics.get_object_or_404(CuratedList, pk=self.kwargs["pk"], user=self.request.user)
        item = serializer.save(curated_list=curated_list)
        self.instance = item

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        response.data = CuratedListItemSerializer(self.instance).data
        return response


class CuratedListItemDetailView(CommunityAccessMixin, generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return CuratedListItem.objects.filter(curated_list__user=self.request.user)

    def get_serializer_class(self):
        if self.request.method in permissions.SAFE_METHODS:
            return CuratedListItemSerializer
        if self.request.method == "PATCH":
            return CuratedListItemUpdateSerializer
        return CuratedListItemSerializer

    def perform_destroy(self, instance):
        with transaction.atomic():
            curated_list = instance.curated_list
            deleted_position = instance.position
            instance.delete()
            CuratedListItem.objects.filter(curated_list=curated_list, position__gt=deleted_position).update(
                position=F("position") - 1
            )


class PublicCuratedListDetailView(generics.RetrieveAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = PublicCuratedListSerializer
    lookup_field = "id_hash"

    def get_queryset(self):
        return (
            CuratedList.objects.filter(is_public=True)
            .select_related("user")
            .prefetch_related(
                "items__company__product_categories",
                "items__company__ownership_markers",
                "items__company__sustainability_markers",
            )
        )


class RecommendationListCreateView(CommunityAccessMixin, generics.ListCreateAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = RecommendationSerializer

    def get_queryset(self):
        return (
            Recommendation.objects.filter(user=self.request.user)
            .select_related("company", "company__business_category")
            .prefetch_related(
                "company__product_categories",
                "company__ownership_markers",
                "company__sustainability_markers",
            )
        )


class RecommendationDetailView(CommunityAccessMixin, generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = RecommendationSerializer

    def get_queryset(self):
        return (
            Recommendation.objects.filter(user=self.request.user)
            .select_related("company", "company__business_category")
            .prefetch_related(
                "company__product_categories",
                "company__ownership_markers",
                "company__sustainability_markers",
            )
        )


class PublicRecommendationListView(generics.ListAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = PublicRecommendationSerializer

    def get_queryset(self):
        return (
            Recommendation.objects.filter(is_public=True)
            .select_related("company", "company__business_category")
            .prefetch_related(
                "company__product_categories",
                "company__ownership_markers",
                "company__sustainability_markers",
            )
        )
