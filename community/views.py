from django.db import transaction
from django.db.models import F
from django.db.models import Count, Prefetch
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from companies.search import build_apostrophe_insensitive_query, split_search_terms

from .models import CuratedList, CuratedListItem, Favorite, Recommendation, SavedCuratedList
from .serializers import (
    CuratedListItemCreateSerializer,
    CuratedListItemSerializer,
    CuratedListItemUpdateSerializer,
    CuratedListSerializer,
    FavoriteSerializer,
    PublicCuratedListSerializer,
    PublicCuratedListPreviewSerializer,
    PublicRecommendationSerializer,
    RecommendationSerializer,
    SavedCuratedListCreateSerializer,
    SavedCuratedListSerializer,
)


def public_curated_list_preview_queryset():
    return (
        CuratedList.objects.filter(is_public=True)
        .select_related("user")
        .annotate(item_count=Count("items", distinct=True))
        .filter(item_count__gt=0)
        .prefetch_related(
            Prefetch(
                "items",
                queryset=CuratedListItem.objects.select_related("company").order_by("position", "created_at", "pk"),
            )
        )
        .order_by("-updated_at", "-pk")
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


class PublicCuratedListSearchView(generics.ListAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = PublicCuratedListPreviewSerializer
    search_text_fields = (
        "title",
        "user__display_name",
        "user__first_name",
        "user__last_name",
        "user__public_slug",
        "items__company__name",
    )

    def get_queryset(self):
        queryset = public_curated_list_preview_queryset()
        search = self.request.query_params.get("search", "").strip()
        terms = split_search_terms(search)
        if not terms:
            return queryset

        for term in terms:
            queryset = queryset.filter(build_apostrophe_insensitive_query(term, self.search_text_fields))

        return queryset.distinct().order_by("-updated_at", "-pk")


class SavedCuratedListListCreateView(CommunityAccessMixin, generics.ListCreateAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return (
            SavedCuratedList.objects.filter(user=self.request.user, curated_list__is_public=True)
            .select_related("curated_list", "curated_list__user")
            .annotate(item_count=Count("curated_list__items", distinct=True))
            .filter(item_count__gt=0)
            .prefetch_related(
                Prefetch(
                    "curated_list__items",
                    queryset=CuratedListItem.objects.select_related("company").order_by("position", "created_at", "pk"),
                )
            )
            .order_by("-created_at", "-pk")
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return SavedCuratedListCreateSerializer
        return SavedCuratedListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        instance = (
            SavedCuratedList.objects.select_related("curated_list", "curated_list__user")
            .prefetch_related(
                Prefetch(
                    "curated_list__items",
                    queryset=CuratedListItem.objects.select_related("company").order_by("position", "created_at", "pk"),
                )
            )
            .get(pk=instance.pk)
        )
        instance.item_count = instance.curated_list.items.count()
        response_serializer = SavedCuratedListSerializer(instance, context=self.get_serializer_context())
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class SavedCuratedListDetailView(CommunityAccessMixin, generics.DestroyAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return SavedCuratedList.objects.filter(user=self.request.user)


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
