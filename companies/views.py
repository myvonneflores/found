from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .cities import canonicalize_city
from .filters import CompanyFilterSet
from .models import (
    BusinessCategory,
    Company,
    CuisineType,
    OwnershipMarker,
    ProductCategory,
    SustainabilityMarker,
)
from .serializers import (
    BusinessCategorySerializer,
    CompanyDetailSerializer,
    CompanyListSerializer,
    CuisineTypeSerializer,
    OwnershipMarkerSerializer,
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
            .prefetch_related(
                "product_categories",
                "ownership_markers",
                "sustainability_markers",
            )
            .distinct()
        )


class CompanyDetailView(generics.RetrieveAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = CompanyDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return Company.objects.select_related("business_category").prefetch_related(
            "product_categories",
            "ownership_markers",
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


class CuisineTypeListView(generics.ListAPIView):
    permission_classes = (permissions.AllowAny,)
    queryset = CuisineType.objects.all()
    serializer_class = CuisineTypeSerializer
    pagination_class = None


class OwnershipMarkerListView(generics.ListAPIView):
    permission_classes = (permissions.AllowAny,)
    queryset = OwnershipMarker.objects.all()
    serializer_class = OwnershipMarkerSerializer
    pagination_class = None


class SustainabilityMarkerListView(generics.ListAPIView):
    permission_classes = (permissions.AllowAny,)
    queryset = SustainabilityMarker.objects.all()
    serializer_class = SustainabilityMarkerSerializer
    pagination_class = None


class CityOptionListView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        raw_cities = Company.objects.exclude(city="").values_list("city", flat=True).distinct()
        cities = sorted({canonicalize_city(city) for city in raw_cities if canonicalize_city(city)})
        return Response(list(cities))
