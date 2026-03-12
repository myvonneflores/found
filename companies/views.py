from rest_framework import generics, permissions

from .filters import CompanyFilterSet
from .models import BusinessCategory, Company, ProductCategory, SustainabilityMarker
from .serializers import (
    BusinessCategorySerializer,
    CompanyDetailSerializer,
    CompanyListSerializer,
    ProductCategorySerializer,
    SustainabilityMarkerSerializer,
)


class CompanyListView(generics.ListAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = CompanyListSerializer
    filterset_class = CompanyFilterSet
    search_fields = ("name", "description", "city", "state", "country")
    ordering_fields = ("name", "founded_year", "number_of_employees", "created_at")
    ordering = ("name",)

    def get_queryset(self):
        return (
            Company.objects.select_related("business_category")
            .prefetch_related("product_categories", "sustainability_markers")
            .distinct()
        )


class CompanyDetailView(generics.RetrieveAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = CompanyDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return Company.objects.select_related("business_category").prefetch_related(
            "product_categories",
            "sustainability_markers",
        )


class BusinessCategoryListView(generics.ListAPIView):
    permission_classes = (permissions.AllowAny,)
    queryset = BusinessCategory.objects.all()
    serializer_class = BusinessCategorySerializer
    pagination_class = None


class ProductCategoryListView(generics.ListAPIView):
    permission_classes = (permissions.AllowAny,)
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer
    pagination_class = None


class SustainabilityMarkerListView(generics.ListAPIView):
    permission_classes = (permissions.AllowAny,)
    queryset = SustainabilityMarker.objects.all()
    serializer_class = SustainabilityMarkerSerializer
    pagination_class = None
