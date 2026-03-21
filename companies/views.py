from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .business_categories import normalize_business_category_name
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
    CompanyDomainMatchSerializer,
    CommunityCompanyCreateSerializer,
    CompanyDetailSerializer,
    CompanyListSerializer,
    CuisineTypeSerializer,
    ManagedBusinessLocationSerializer,
    ManagedBusinessCompanySerializer,
    OwnershipMarkerSerializer,
    ProductCategorySerializer,
    SustainabilityMarkerSerializer,
)
from .creation import normalized_hostname, resolve_company_group
from users.models import BusinessClaim


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
                "business_claims",
                "business_categories",
                "product_categories",
                "ownership_markers",
                "sustainability_markers",
            )
            .filter(is_published=True)
            .distinct()
        )


class CompanyDetailView(generics.RetrieveAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = CompanyDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return Company.objects.select_related("business_category").prefetch_related(
            "business_claims",
            "business_categories",
            "product_categories",
            "cuisine_types",
            "ownership_markers",
            "sustainability_markers",
            "recommendations",
        )


class ManagedBusinessAccessMixin:
    def _assert_verified_business_user(self):
        user = self.request.user
        if user.account_type != user.AccountType.BUSINESS:
            raise PermissionDenied("Only business accounts can manage a business profile.")
        if not user.is_business_verified:
            raise PermissionDenied("Your business needs to be verified before you can edit this profile.")
        return user

    def _managed_company_queryset(self):
        user = self._assert_verified_business_user()
        return (
            Company.objects.filter(
                business_claims__user=user,
                business_claims__status=BusinessClaim.VerificationStatus.VERIFIED,
            )
            .select_related("business_category", "company_group")
            .prefetch_related(
                "business_categories",
                "product_categories",
                "cuisine_types",
                "ownership_markers",
                "sustainability_markers",
            )
            .distinct()
        )

    def _managed_claim_queryset(self, *, company_required):
        user = self._assert_verified_business_user()
        claim_filters = {"status": BusinessClaim.VerificationStatus.VERIFIED}
        if company_required:
            claim_filters["company__isnull"] = False
        return (
            user.business_claims.filter(**claim_filters)
            .select_related("company", "company__company_group")
            .order_by("submitted_at", "pk")
        )

    def _get_primary_managed_claim(self, *, company_required):
        managed_claim = self._managed_claim_queryset(company_required=company_required).first()
        if managed_claim is None:
            if company_required:
                raise PermissionDenied("We couldn't find a verified business profile to manage yet.")
            raise PermissionDenied("We couldn't find a verified business claim to connect to a company profile.")
        return managed_claim

    def _get_primary_managed_company(self, *, required):
        managed_claim = self._managed_claim_queryset(company_required=True).first()
        if managed_claim is None:
            if required:
                raise PermissionDenied("We couldn't find a verified business profile to manage yet.")
            return None
        return managed_claim.company

    def _ensure_company_group(self, company):
        if company.company_group_id:
            return company.company_group
        return resolve_company_group(
            company=company,
            matched_hostname_companies=[company],
            hostname=normalized_hostname(company.website),
        )


class ManagedBusinessCompanyCurrentView(ManagedBusinessAccessMixin, generics.RetrieveUpdateAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = ManagedBusinessCompanySerializer

    def get_object(self):
        return self._get_primary_managed_company(required=True)

    def post(self, request, *args, **kwargs):
        existing_company = self._get_primary_managed_company(required=False)
        if existing_company is not None:
            serializer = self.get_serializer(existing_company)
            return Response(serializer.data, status=status.HTTP_200_OK)

        claim = self._get_primary_managed_claim(company_required=False)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        company = serializer.save(
            listing_origin=Company.ListingOrigin.OWNER,
            submitted_by=request.user,
        )
        claim.company = company
        claim.save(update_fields=("company",))
        output = self.get_serializer(company)
        return Response(output.data, status=status.HTTP_201_CREATED)


class ManagedBusinessLocationListCreateView(ManagedBusinessAccessMixin, generics.ListCreateAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return self._managed_company_queryset().order_by("name", "address", "pk")

    def get_serializer_class(self):
        if self.request.method in permissions.SAFE_METHODS:
            return ManagedBusinessLocationSerializer
        return ManagedBusinessCompanySerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.request.method == "POST":
            primary_company = self._get_primary_managed_company(required=False)
            if primary_company is not None:
                context["preferred_company_group"] = self._ensure_company_group(primary_company)
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            company = serializer.save(
                listing_origin=Company.ListingOrigin.OWNER,
                submitted_by=request.user,
            )
            primary_company = self._get_primary_managed_company(required=False)
            if primary_company is None:
                claim = self._get_primary_managed_claim(company_required=False)
                claim.company = company
                claim.save(update_fields=("company",))
            else:
                BusinessClaim.objects.create(
                    user=request.user,
                    company=company,
                    intent=BusinessClaim.ClaimIntent.NEW,
                    status=BusinessClaim.VerificationStatus.VERIFIED,
                    business_name=company.name,
                    submitter_first_name=request.user.first_name,
                    submitter_last_name=request.user.last_name,
                    business_email=request.user.email,
                    website=company.website,
                    role_title="Verified owner",
                )

        output = ManagedBusinessCompanySerializer(company, context=self.get_serializer_context())
        headers = self.get_success_headers(output.data)
        return Response(output.data, status=status.HTTP_201_CREATED, headers=headers)


class ManagedBusinessLocationDetailView(ManagedBusinessAccessMixin, generics.RetrieveUpdateAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = ManagedBusinessCompanySerializer
    lookup_field = "slug"

    def get_queryset(self):
        return self._managed_company_queryset()


class CommunityCompanyCreateView(generics.CreateAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = CommunityCompanyCreateSerializer


class CompanyDomainMatchView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        website = request.query_params.get("website", "")
        hostname = normalized_hostname(website)
        if not hostname:
            return Response({"matched": False, "companies": []})

        matches = [
            company
            for company in Company.objects.exclude(website="")
            if normalized_hostname(company.website) == hostname
        ]
        if not matches:
            return Response({"matched": False, "companies": []})

        ordered_matches = sorted(matches, key=lambda company: (company.name.lower(), company.address.lower(), company.pk))
        return Response(
            {
                "matched": True,
                "companies": CompanyDomainMatchSerializer(ordered_matches, many=True).data,
            }
        )


class BusinessCategoryListView(generics.ListAPIView):
    permission_classes = (permissions.AllowAny,)
    queryset = BusinessCategory.objects.all()
    serializer_class = BusinessCategorySerializer
    pagination_class = None

    def list(self, request, *args, **kwargs):
        categories_by_name = {}

        for category in self.get_queryset():
            normalized_name = normalize_business_category_name(category.name)
            serialized = self.get_serializer(category).data
            serialized["name"] = normalized_name

            existing = categories_by_name.get(normalized_name)
            if existing is None or category.name == normalized_name:
                categories_by_name[normalized_name] = serialized

        return Response([categories_by_name[name] for name in sorted(categories_by_name)])


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
