from django.contrib import admin

from .models import BusinessCategory, Company, ProductCategory, SustainabilityMarker


@admin.register(BusinessCategory)
class BusinessCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "id_hash", "created_at")
    search_fields = ("name",)


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "id_hash", "created_at")
    search_fields = ("name",)


@admin.register(SustainabilityMarker)
class SustainabilityMarkerAdmin(admin.ModelAdmin):
    list_display = ("name", "id_hash", "created_at")
    search_fields = ("name",)


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "business_category",
        "city",
        "state",
        "country",
        "is_vegan_friendly",
        "is_gf_friendly",
    )
    list_filter = (
        "business_category",
        "city",
        "state",
        "country",
        "is_vegan_friendly",
        "is_gf_friendly",
    )
    search_fields = ("name", "description", "city", "state", "country")
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = ("product_categories", "sustainability_markers")
