from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils import timezone

from .models import BusinessClaim, PersonalProfile, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "first_name", "last_name", "account_type", "is_business_verified", "is_staff")
    list_filter = ("account_type", "is_staff", "is_superuser", "is_active")
    search_fields = ("email", "first_name", "last_name")
    ordering = ("email",)

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "display_name")}),
        ("Account", {"fields": ("account_type", "onboarding_completed")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "account_type", "display_name"),
            },
        ),
    )

    @admin.display(boolean=True)
    def is_business_verified(self, obj):
        return obj.is_business_verified


@admin.register(PersonalProfile)
class PersonalProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "location", "is_public")
    search_fields = ("user__email", "user__display_name", "location")


@admin.register(BusinessClaim)
class BusinessClaimAdmin(admin.ModelAdmin):
    list_display = ("business_name", "user", "company", "status", "submitted_at", "reviewed_at", "reviewed_by")
    list_filter = ("status",)
    search_fields = ("business_name", "business_email", "company__name", "user__email")
    actions = ("mark_verified", "mark_rejected")

    @admin.action(description="Mark selected claims as verified")
    def mark_verified(self, request, queryset):
        queryset.update(
            status=BusinessClaim.VerificationStatus.VERIFIED,
            reviewed_at=timezone.now(),
            reviewed_by=request.user,
        )

    @admin.action(description="Mark selected claims as rejected")
    def mark_rejected(self, request, queryset):
        queryset.update(
            status=BusinessClaim.VerificationStatus.REJECTED,
            reviewed_at=timezone.now(),
            reviewed_by=request.user,
        )
