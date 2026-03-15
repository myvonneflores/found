from django.db.models import Count
from django.db.utils import OperationalError, ProgrammingError
from rest_framework import serializers

from community.models import CuratedList
from users.models import BusinessClaim

from .models import (
    BusinessCategory,
    Company,
    CuisineType,
    OwnershipMarker,
    ProductCategory,
    SustainabilityMarker,
)


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
    business_category = serializers.SerializerMethodField()
    business_categories = serializers.StringRelatedField(many=True)
    product_categories = serializers.StringRelatedField(many=True)
    ownership_markers = serializers.StringRelatedField(many=True)
    sustainability_markers = serializers.StringRelatedField(many=True)

    def get_business_category(self, obj):
        return obj.business_category.name if obj.business_category else None

    class Meta:
        model = Company
        fields = (
            "id",
            "id_hash",
            "name",
            "slug",
            "description",
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
        )


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
    claimed_profile = serializers.SerializerMethodField()
    business_category = BusinessCategorySerializer()
    business_categories = BusinessCategorySerializer(many=True)
    product_categories = ProductCategorySerializer(many=True)
    cuisine_types = serializers.SerializerMethodField()
    ownership_markers = OwnershipMarkerSerializer(many=True)
    sustainability_markers = serializers.SerializerMethodField()

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
            "website",
            "founded_year",
            "address",
            "city",
            "state",
            "zip_code",
            "country",
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
            "created_at",
            "updated_at",
        )


class ManagedBusinessCompanySerializer(serializers.ModelSerializer):
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

        if "business_categories" in attrs:
            attrs["business_category"] = attrs["business_categories"][0] if attrs["business_categories"] else None
        elif "business_category" in attrs and attrs["business_category"] is not None:
            attrs["business_categories"] = [attrs["business_category"]]

        return attrs
