from urllib.parse import urlparse

from django.db.models import Count
from django.db.utils import OperationalError, ProgrammingError
from django.utils import timezone
from rest_framework import serializers

from community.models import CuratedList
from users.models import BusinessClaim

from .business_hours import validate_business_hours, validate_timezone
from .cities import canonicalize_city
from .models import (
    BusinessCategory,
    Company,
    CuisineType,
    OwnershipMarker,
    ProductCategory,
    SustainabilityMarker,
)


class CanonicalCityField(serializers.CharField):
    def to_representation(self, value):
        return canonicalize_city(super().to_representation(value))

    def to_internal_value(self, data):
        return canonicalize_city(super().to_internal_value(data))


class TaxonomySerializer(serializers.ModelSerializer):
    class Meta:
        fields = ("id", "id_hash", "name", "description")


class BusinessCategorySerializer(TaxonomySerializer):
    class Meta(TaxonomySerializer.Meta):
        model = BusinessCategory


class ProductCategorySerializer(TaxonomySerializer):
    class Meta(TaxonomySerializer.Meta):
        model = ProductCategory


class CuisineTypeSerializer(TaxonomySerializer):
    class Meta(TaxonomySerializer.Meta):
        model = CuisineType


class OwnershipMarkerSerializer(TaxonomySerializer):
    class Meta(TaxonomySerializer.Meta):
        model = OwnershipMarker


class SustainabilityMarkerSerializer(TaxonomySerializer):
    class Meta(TaxonomySerializer.Meta):
        model = SustainabilityMarker


class CompanyListSerializer(serializers.ModelSerializer):
    city = CanonicalCityField(read_only=True)
    business_category = serializers.SerializerMethodField()
    business_categories = serializers.StringRelatedField(many=True)
    product_categories = serializers.StringRelatedField(many=True)
    ownership_markers = serializers.StringRelatedField(many=True)
    sustainability_markers = serializers.StringRelatedField(many=True)
    is_community_listed = serializers.SerializerMethodField()

    def get_business_category(self, obj):
        return obj.business_category.name if obj.business_category else None

    def _has_verified_claim(self, obj):
        prefetched_claims = getattr(obj, "_prefetched_objects_cache", {}).get("business_claims")
        if prefetched_claims is not None:
            return any(claim.status == BusinessClaim.VerificationStatus.VERIFIED for claim in prefetched_claims)
        return obj.business_claims.filter(status=BusinessClaim.VerificationStatus.VERIFIED).exists()

    def get_is_community_listed(self, obj):
        return (
            obj.listing_origin == Company.ListingOrigin.COMMUNITY
            and not self._has_verified_claim(obj)
        )

    class Meta:
        model = Company
        fields = (
            "id",
            "id_hash",
            "name",
            "slug",
            "description",
            "listing_origin",
            "is_community_listed",
            "city",
            "state",
            "country",
            "business_category",
            "business_categories",
            "product_categories",
            "ownership_markers",
            "sustainability_markers",
            "is_vegan_friendly",
            "is_gf_friendly",
            "is_published",
        )
        read_only_fields = ("is_published",)


class ClaimedCompanyPublicListSerializer(serializers.ModelSerializer):
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CuratedList
        fields = ("id", "id_hash", "title", "description", "updated_at", "item_count")


class ClaimedCompanyProfileSerializer(serializers.Serializer):
    display_name = serializers.CharField()
    public_slug = serializers.CharField()
    account_type = serializers.CharField()
    public_list_count = serializers.IntegerField()
    public_lists = ClaimedCompanyPublicListSerializer(many=True)


class CompanyDetailSerializer(serializers.ModelSerializer):
    city = CanonicalCityField(read_only=True)
    claimed_profile = serializers.SerializerMethodField()
    business_category = BusinessCategorySerializer()
    business_categories = BusinessCategorySerializer(many=True)
    product_categories = ProductCategorySerializer(many=True)
    cuisine_types = serializers.SerializerMethodField()
    ownership_markers = OwnershipMarkerSerializer(many=True)
    sustainability_markers = serializers.SerializerMethodField()
    is_community_listed = serializers.SerializerMethodField()

    def get_cuisine_types(self, obj):
        try:
            return CuisineTypeSerializer(obj.cuisine_types.all(), many=True).data
        except (OperationalError, ProgrammingError):
            return []

    def get_claimed_profile(self, obj):
        verified_claim = (
            obj.business_claims.filter(status=BusinessClaim.VerificationStatus.VERIFIED)
            .select_related("user")
            .order_by("-submitted_at", "-pk")
            .first()
        )
        if not verified_claim:
            return None

        owner = verified_claim.user
        public_lists = owner.curated_lists.filter(is_public=True).annotate(item_count=Count("items"))
        public_list_count = public_lists.count()
        if public_list_count == 0:
            return None

        display_name = owner.display_name or owner.first_name or owner.email.split("@")[0]
        summary = {
            "display_name": display_name,
            "public_slug": owner.public_slug or "",
            "account_type": owner.account_type,
            "public_list_count": public_list_count,
            "public_lists": list(public_lists[:3]),
        }
        return ClaimedCompanyProfileSerializer(summary).data

    def get_is_community_listed(self, obj):
        prefetched_claims = getattr(obj, "_prefetched_objects_cache", {}).get("business_claims")
        if prefetched_claims is not None:
            has_verified_claim = any(
                claim.status == BusinessClaim.VerificationStatus.VERIFIED for claim in prefetched_claims
            )
        else:
            has_verified_claim = obj.business_claims.filter(status=BusinessClaim.VerificationStatus.VERIFIED).exists()
        return (
            obj.listing_origin == Company.ListingOrigin.COMMUNITY
            and not has_verified_claim
        )

    def get_sustainability_markers(self, obj):
        markers = SustainabilityMarkerSerializer(obj.sustainability_markers.all(), many=True).data

        if obj.is_vegan_friendly:
            markers.append(
                {
                    "id": -1,
                    "id_hash": "vegan-friendly",
                    "name": "Vegan-friendly",
                    "description": "",
                }
            )

        if obj.is_gf_friendly:
            markers.append(
                {
                    "id": -2,
                    "id_hash": "gluten-free-friendly",
                    "name": "Gluten-free-friendly",
                    "description": "",
                }
            )

        return markers

    class Meta:
        model = Company
        fields = (
            "id",
            "id_hash",
            "name",
            "slug",
            "description",
            "listing_origin",
            "is_community_listed",
            "website",
            "founded_year",
            "address",
            "city",
            "state",
            "zip_code",
            "country",
            "business_hours",
            "business_hours_timezone",
            "business_category",
            "business_categories",
            "product_categories",
            "cuisine_types",
            "claimed_profile",
            "ownership_markers",
            "sustainability_markers",
            "instagram_handle",
            "facebook_page",
            "linkedin_page",
            "is_vegan_friendly",
            "is_gf_friendly",
            "is_published",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "slug", "is_published")


def _normalize_website(value):
    value = value.strip()
    if not value:
        return ""
    if "://" not in value:
        value = f"https://{value}"
    return value


def _normalized_hostname(value):
    if not value:
        return ""
    parsed = urlparse(value)
    hostname = parsed.netloc or parsed.path
    hostname = hostname.lower().strip()
    if hostname.startswith("www."):
        hostname = hostname[4:]
    return hostname.rstrip("/")


class BaseCompanyWriteSerializer(serializers.ModelSerializer):
    city = CanonicalCityField(required=False, allow_blank=True)
    business_hours = serializers.JSONField(required=False, allow_null=True)
    business_hours_timezone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    business_category = serializers.PrimaryKeyRelatedField(
        queryset=BusinessCategory.objects.all(),
        allow_null=True,
        required=False,
    )
    business_categories = serializers.PrimaryKeyRelatedField(
        queryset=BusinessCategory.objects.all(),
        many=True,
        required=False,
    )
    product_categories = serializers.PrimaryKeyRelatedField(
        queryset=ProductCategory.objects.all(),
        many=True,
        required=False,
    )
    cuisine_types = serializers.PrimaryKeyRelatedField(
        queryset=CuisineType.objects.all(),
        many=True,
        required=False,
    )
    ownership_markers = serializers.PrimaryKeyRelatedField(
        queryset=OwnershipMarker.objects.all(),
        many=True,
        required=False,
    )
    sustainability_markers = serializers.PrimaryKeyRelatedField(
        queryset=SustainabilityMarker.objects.all(),
        many=True,
        required=False,
    )

    def validate_website(self, value):
        return _normalize_website(value)

    def validate_business_hours_timezone(self, value):
        return validate_timezone(value)

    def validate(self, attrs):
        attrs = super().validate(attrs)

        if "business_categories" in attrs:
            attrs["business_category"] = attrs["business_categories"][0] if attrs["business_categories"] else None
        elif "business_category" in attrs and attrs["business_category"] is not None:
            attrs["business_categories"] = [attrs["business_category"]]

        next_hours = attrs["business_hours"] if "business_hours" in attrs else getattr(self.instance, "business_hours", None)
        next_timezone = (
            attrs["business_hours_timezone"]
            if "business_hours_timezone" in attrs
            else getattr(self.instance, "business_hours_timezone", None)
        )

        if next_hours is not None and next_timezone is None:
            raise serializers.ValidationError({"business_hours_timezone": "Business hours require a valid timezone."})

        if "business_hours" in attrs:
            try:
                attrs["business_hours"] = validate_business_hours(attrs["business_hours"], next_timezone)
            except serializers.ValidationError as exc:
                raise serializers.ValidationError({"business_hours": exc.detail}) from exc
        elif next_hours is not None and "business_hours_timezone" in attrs:
            try:
                validate_business_hours(next_hours, attrs["business_hours_timezone"])
            except serializers.ValidationError as exc:
                raise serializers.ValidationError({"business_hours": exc.detail}) from exc

        return attrs


class ManagedBusinessCompanySerializer(BaseCompanyWriteSerializer):
    is_published = serializers.BooleanField(required=False)

    class Meta:
        model = Company
        fields = (
            "id",
            "slug",
            "name",
            "description",
            "website",
            "address",
            "city",
            "state",
            "zip_code",
            "business_hours",
            "business_hours_timezone",
            "business_category",
            "business_categories",
            "product_categories",
            "cuisine_types",
            "ownership_markers",
            "sustainability_markers",
            "instagram_handle",
            "facebook_page",
            "linkedin_page",
            "is_vegan_friendly",
            "is_gf_friendly",
            "is_published",
        )
        read_only_fields = ("id", "slug")

    def _inject_manual_hours_metadata(self, validated_data):
        if "business_hours" not in validated_data:
            return validated_data

        validated_data["business_hours_source"] = Company.BusinessHoursSource.OWNER_MANUAL
        validated_data["business_hours_source_url"] = ""
        validated_data["business_hours_raw"] = ""
        validated_data["business_hours_last_verified_at"] = timezone.now()
        return validated_data

    def create(self, validated_data):
        self._inject_manual_hours_metadata(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        self._inject_manual_hours_metadata(validated_data)
        return super().update(instance, validated_data)


class CommunityCompanyCreateSerializer(BaseCompanyWriteSerializer):
    class Meta:
        model = Company
        fields = (
            "id",
            "slug",
            "name",
            "description",
            "website",
            "address",
            "city",
            "state",
            "zip_code",
            "business_hours",
            "business_hours_timezone",
            "business_category",
            "business_categories",
            "product_categories",
            "cuisine_types",
            "ownership_markers",
            "sustainability_markers",
            "instagram_handle",
            "facebook_page",
            "linkedin_page",
            "is_vegan_friendly",
            "is_gf_friendly",
        )
        read_only_fields = ("id", "slug")

    def validate(self, attrs):
        attrs = super().validate(attrs)

        user = self.context["request"].user
        if user.account_type != user.AccountType.PERSONAL:
            raise serializers.ValidationError("Only personal users can create community business listings.")

        address = attrs.get("address", "").strip()
        city = attrs.get("city", "").strip()
        website = attrs.get("website", "").strip()
        if not any((address, city, website)):
            raise serializers.ValidationError(
                "Add at least a website, city, or street address so the community can identify this listing."
            )

        name = attrs.get("name", "").strip()
        state = attrs.get("state", "").strip()
        hostname = _normalized_hostname(website)

        duplicate_queryset = Company.objects.all()
        if hostname:
            duplicate_queryset = duplicate_queryset.filter(website__icontains=hostname)
        else:
            if not city or not state:
                return attrs
            duplicate_queryset = duplicate_queryset.filter(
                name__iexact=name,
                city__iexact=city,
                state__iexact=state,
            )

        if duplicate_queryset.exists():
            raise serializers.ValidationError(
                "A similar business listing already exists on FOUND."
            )

        return attrs

    def create(self, validated_data):
        many_to_many_fields = {}
        for field_name in (
            "business_categories",
            "product_categories",
            "cuisine_types",
            "ownership_markers",
            "sustainability_markers",
        ):
            if field_name in validated_data:
                many_to_many_fields[field_name] = validated_data.pop(field_name)

        company = Company.objects.create(
            **validated_data,
            listing_origin=Company.ListingOrigin.COMMUNITY,
            submitted_by=self.context["request"].user,
            needs_editorial_review=True,
            is_published=True,
        )

        for field_name, values in many_to_many_fields.items():
            getattr(company, field_name).set(values)

        return company
