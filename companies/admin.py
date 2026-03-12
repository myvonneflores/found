from django.contrib import admin
from django.db.models import Count, Q

from .models import (
    BusinessCategory,
    Company,
    OwnershipMarker,
    ProductCategory,
    SustainabilityMarker,
)


class CompanyDataQualityFilter(admin.SimpleListFilter):
    title = "data quality"
    parameter_name = "data_quality"

    def lookups(self, request, model_admin):
        return (
            ("missing_location", "Missing location"),
            ("missing_website", "Missing website"),
            ("missing_description", "Missing description"),
            ("missing_core_fields", "Missing website or description"),
            ("needs_editorial_review", "Needs editorial review"),
        )

    def queryset(self, request, queryset):
        if self.value() == "missing_location":
            return queryset.filter(Q(city="") | Q(state="") | Q(country=""))
        if self.value() == "missing_website":
            return queryset.filter(website="")
        if self.value() == "missing_description":
            return queryset.filter(description="")
        if self.value() == "missing_core_fields":
            return queryset.filter(Q(website="") | Q(description=""))
        if self.value() == "needs_editorial_review":
            return queryset.filter(needs_editorial_review=True)
        return queryset


@admin.register(BusinessCategory)
class BusinessCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "company_count", "id_hash", "created_at")
    search_fields = ("name",)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(company_count_value=Count("companies"))

    @admin.display(ordering="company_count_value")
    def company_count(self, obj):
        return obj.company_count_value


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "company_count", "id_hash", "created_at")
    search_fields = ("name",)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(company_count_value=Count("companies"))

    @admin.display(ordering="company_count_value")
    def company_count(self, obj):
        return obj.company_count_value


@admin.register(OwnershipMarker)
class OwnershipMarkerAdmin(admin.ModelAdmin):
    list_display = ("name", "company_count", "id_hash", "created_at")
    search_fields = ("name",)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(company_count_value=Count("companies"))

    @admin.display(ordering="company_count_value")
    def company_count(self, obj):
        return obj.company_count_value


@admin.register(SustainabilityMarker)
class SustainabilityMarkerAdmin(admin.ModelAdmin):
    list_display = ("name", "company_count", "id_hash", "created_at")
    search_fields = ("name",)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(company_count_value=Count("companies"))

    @admin.display(ordering="company_count_value")
    def company_count(self, obj):
        return obj.company_count_value


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "business_category",
        "city",
        "state",
        "country",
        "has_description",
        "has_website",
        "needs_editorial_review",
        "is_vegan_friendly",
        "is_gf_friendly",
    )
    list_filter = (
        CompanyDataQualityFilter,
        "business_category",
        "city",
        "state",
        "country",
        "is_vegan_friendly",
        "is_gf_friendly",
    )
    search_fields = ("name", "description", "city", "state", "country")
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = ("product_categories", "ownership_markers", "sustainability_markers")
    list_editable = ("needs_editorial_review",)

    @admin.display(boolean=True)
    def has_description(self, obj):
        return bool(obj.description)

    @admin.display(boolean=True)
    def has_website(self, obj):
        return bool(obj.website)
