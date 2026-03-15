from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions, status
from rest_framework.exceptions import PermissionDenied
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
    ManagedBusinessCompanySerializer,
    OwnershipMarkerSerializer,
    ProductCategorySerializer,
    SustainabilityMarkerSerializer,
)


class CompanyListView(generics.ListAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = CompanyListSerializer
    filter_backends = (DjangoFilterBackend, filters.OrderingFilter)
    filterset_class = CompanyFilterSet
    ordering_fields = ("name", "founded_year", "number_of_employees", "created_at")
    ordering = ("name",)

    def get_queryset(self):
        return (
            Company.objects.select_related("business_category")
            .prefetch_related(
                "business_categories",
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
            "business_categories",
            "product_categories",
            "ownership_markers",
            "sustainability_markers",
        )


class ManagedBusinessCompanyView(generics.RetrieveUpdateAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = ManagedBusinessCompanySerializer

    def _get_latest_verified_claim(self, *, company_required: bool):
        user = self.request.user
        if user.account_type != user.AccountType.BUSINESS:
            raise PermissionDenied("Only business accounts can manage a business profile.")
        if not user.is_business_verified:
            raise PermissionDenied("Your business needs to be verified before you can edit this profile.")

        claim_filters = {"status": "verified"}
        if company_required:
            claim_filters["company__isnull"] = False

        verified_claim = user.business_claims.filter(**claim_filters).select_related("company").order_by(
            "-submitted_at", "-pk"
        ).first()

        if not verified_claim:
            if company_required:
                raise PermissionDenied("We couldn't find a verified business profile to manage yet.")
            raise PermissionDenied("We couldn't find a verified business claim to connect to a company profile.")
        return verified_claim

    def get_object(self):
        return self._get_latest_verified_claim(company_required=True).company

    def post(self, request, *args, **kwargs):
        existing_claim = (
            request.user.business_claims.filter(status="verified", company__isnull=False)
            .select_related("company")
            .order_by("-submitted_at", "-pk")
            .first()
        )
        if existing_claim:
            serializer = self.get_serializer(existing_claim.company)
            return Response(serializer.data, status=status.HTTP_200_OK)

        claim = self._get_latest_verified_claim(company_required=False)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        company = serializer.save()
        claim.company = company
        claim.save(update_fields=("company",))
        output = self.get_serializer(company)
        return Response(output.data, status=status.HTTP_201_CREATED)


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
