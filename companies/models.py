from django.db import models
from django.utils.text import slugify

from core.models import BaseModel


class NamedTaxonomy(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        abstract = True
        ordering = ["name"]

    def __str__(self):
        return self.name


class BusinessCategory(NamedTaxonomy):
    class Meta(NamedTaxonomy.Meta):
        verbose_name_plural = "Business categories"


class SustainabilityMarker(NamedTaxonomy):
    class Meta(NamedTaxonomy.Meta):
        verbose_name_plural = "Sustainability markers"


class ProductCategory(NamedTaxonomy):
    class Meta(NamedTaxonomy.Meta):
        verbose_name_plural = "Product categories"


class CuisineType(NamedTaxonomy):
    class Meta(NamedTaxonomy.Meta):
        verbose_name_plural = "Cuisine types"


class OwnershipMarker(NamedTaxonomy):
    class Meta(NamedTaxonomy.Meta):
        verbose_name_plural = "Ownership markers"


class Company(BaseModel):
    class ListingOrigin(models.TextChoices):
        IMPORTED = "imported", "Imported"
        OWNER = "owner", "Owner"
        COMMUNITY = "community", "Community"

    class BusinessHoursSource(models.TextChoices):
        OWNER_MANUAL = "owner_manual", "Owner manual"
        WEBSITE_STRUCTURED_DATA = "website_structured_data", "Website structured data"
        WEBSITE_TEXT_EXTRACTION = "website_text_extraction", "Website text extraction"
        GOOGLE_BUSINESS_PROFILE = "google_business_profile", "Google Business Profile"
        BULK_IMPORT = "bulk_import", "Bulk import"
        EDITORIAL_MANUAL = "editorial_manual", "Editorial manual"

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    description = models.TextField(blank=True)
    needs_editorial_review = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)
    listing_origin = models.CharField(
        max_length=20,
        choices=ListingOrigin.choices,
        default=ListingOrigin.IMPORTED,
    )
    website = models.URLField(blank=True)
    founded_year = models.PositiveIntegerField(null=True, blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=120, blank=True)
    state = models.CharField(max_length=120, blank=True)
    zip_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=120, blank=True)
    business_hours = models.JSONField(null=True, blank=True)
    business_hours_timezone = models.CharField(max_length=64, null=True, blank=True)
    business_hours_raw = models.TextField(blank=True)
    business_hours_source = models.CharField(
        max_length=32,
        choices=BusinessHoursSource.choices,
        null=True,
        blank=True,
    )
    business_hours_source_url = models.URLField(blank=True)
    business_hours_last_verified_at = models.DateTimeField(null=True, blank=True)
    business_category = models.ForeignKey(
        BusinessCategory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="companies",
    )
    business_categories = models.ManyToManyField(
        BusinessCategory,
        blank=True,
        related_name="categorized_companies",
    )
    product_categories = models.ManyToManyField(
        ProductCategory,
        blank=True,
        related_name="companies",
    )
    cuisine_types = models.ManyToManyField(
        CuisineType,
        blank=True,
        related_name="companies",
    )
    ownership_markers = models.ManyToManyField(
        OwnershipMarker,
        blank=True,
        related_name="companies",
    )
    sustainability_markers = models.ManyToManyField(
        SustainabilityMarker,
        blank=True,
        related_name="companies",
    )
    instagram_handle = models.CharField(max_length=100, blank=True)
    facebook_page = models.URLField(blank=True)
    linkedin_page = models.URLField(blank=True)
    is_vegan_friendly = models.BooleanField(default=False)
    is_gf_friendly = models.BooleanField(default=False)
    annual_revenue = models.BigIntegerField(null=True, blank=True)
    number_of_employees = models.PositiveIntegerField(null=True, blank=True)
    submitted_by = models.ForeignKey(
        "users.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="submitted_companies",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def _slug_location_segment(self):
        for value in (self.city, self.state, self.country):
            segment = slugify(value)
            if segment:
                return segment
        return ""

    def save(self, *args, **kwargs):
        if not self.slug:
            name_slug = slugify(self.name) or self.id_hash.lower()
            location_slug = self._slug_location_segment()
            base_slug = f"{name_slug}-{location_slug}" if location_slug else name_slug
            slug = base_slug
            counter = 2
            while Company.objects.exclude(pk=self.pk).filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)
