from django.db.utils import OperationalError, ProgrammingError
from rest_framework import serializers

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
            "product_categories",
            "ownership_markers",
            "sustainability_markers",
            "is_vegan_friendly",
            "is_gf_friendly",
        )


class CompanyDetailSerializer(serializers.ModelSerializer):
    business_category = BusinessCategorySerializer()
    product_categories = ProductCategorySerializer(many=True)
    cuisine_types = serializers.SerializerMethodField()
    ownership_markers = OwnershipMarkerSerializer(many=True)
    sustainability_markers = SustainabilityMarkerSerializer(many=True)

    def get_cuisine_types(self, obj):
        try:
            return CuisineTypeSerializer(obj.cuisine_types.all(), many=True).data
        except (OperationalError, ProgrammingError):
            return []

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
            "product_categories",
            "cuisine_types",
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
