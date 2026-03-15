from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html, format_html_join

from .forms import BusinessClaimAdminForm
from .models import BusinessClaim, PersonalProfile, User
from .services import review_business_claim


class ReviewStateFilter(admin.SimpleListFilter):
    title = "review state"
    parameter_name = "review_state"

    def lookups(self, request, model_admin):
        return (("reviewed", "Reviewed"), ("unreviewed", "Unreviewed"))

    def queryset(self, request, queryset):
        if self.value() == "reviewed":
            return queryset.exclude(reviewed_at__isnull=True)
        if self.value() == "unreviewed":
            return queryset.filter(reviewed_at__isnull=True)
        return queryset


class CompanyLinkStateFilter(admin.SimpleListFilter):
    title = "company link"
    parameter_name = "company_link"

    def lookups(self, request, model_admin):
        return (("linked", "Linked"), ("unlinked", "Unlinked"))

    def queryset(self, request, queryset):
        if self.value() == "linked":
            return queryset.exclude(company__isnull=True)
        if self.value() == "unlinked":
            return queryset.filter(company__isnull=True)
        return queryset


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
    form = BusinessClaimAdminForm
    list_display = (
        "business_name",
        "intent",
        "user",
        "company",
        "status",
        "submitted_at",
        "reviewed_at",
        "reviewed_by",
    )
    list_filter = ("status", "intent", ReviewStateFilter, CompanyLinkStateFilter)
    search_fields = ("business_name", "business_email", "company__name", "user__email")
    readonly_fields = ("submitted_at", "resubmitted_at", "resubmission_count", "reviewed_at", "reviewed_by", "history_timeline")
    fieldsets = (
        (
            "Claim",
            {
                "fields": (
                    "user",
                    "intent",
                    "company",
                    "business_name",
                    "submitter_first_name",
                    "submitter_last_name",
                    "role_title",
                    "business_email",
                    "business_phone",
                    "website",
                    "instagram_handle",
                    "facebook_page",
                    "linkedin_page",
                    "claim_message",
                )
            },
        ),
        (
            "Review",
            {
                "fields": (
                    "status",
                    "decision_reason_code",
                    "review_checklist",
                    "review_notes",
                    "submitted_at",
                    "resubmitted_at",
                    "resubmission_count",
                    "reviewed_at",
                    "reviewed_by",
                )
            },
        ),
        ("History", {"fields": ("history_timeline",)}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user", "company", "reviewed_by").prefetch_related("history__actor")

    def save_model(self, request, obj, form, change):
        if not change:
            super().save_model(request, obj, form, change)
            return

        previous = BusinessClaim.objects.get(pk=obj.pk)
        desired_status = form.cleaned_data["status"]
        review_checklist = form.cleaned_data.get("review_checklist") or []
        review_notes = form.cleaned_data.get("review_notes", "")
        decision_reason_code = form.cleaned_data.get("decision_reason_code", "")

        if desired_status in {
            BusinessClaim.VerificationStatus.VERIFIED,
            BusinessClaim.VerificationStatus.REJECTED,
        } and (
            previous.status != desired_status
            or previous.decision_reason_code != decision_reason_code
            or previous.review_notes != review_notes
            or previous.review_checklist != review_checklist
        ):
            for field in (
                "user",
                "intent",
                "company",
                "business_name",
                "submitter_first_name",
                "submitter_last_name",
                "role_title",
                "business_email",
                "business_phone",
                "website",
                "instagram_handle",
                "facebook_page",
                "linkedin_page",
                "claim_message",
            ):
                setattr(previous, field, form.cleaned_data[field])
            previous.save()
            review_business_claim(
                previous,
                reviewer=request.user,
                status=desired_status,
                decision_reason_code=decision_reason_code,
                review_checklist=review_checklist,
                review_notes=review_notes,
            )
            obj.refresh_from_db()
            return

        super().save_model(request, obj, form, change)

    @admin.display(description="History")
    def history_timeline(self, obj):
        if not obj.pk or not obj.history.exists():
            return "No timeline yet."
        return format_html(
            "<div>{}</div>",
            format_html_join(
                "",
                "<div style='margin-bottom:0.8rem;'><strong>{}</strong> on {}<br />{} {}</div>",
                (
                    (
                        event.get_event_type_display(),
                        event.occurred_at.strftime("%Y-%m-%d %H:%M"),
                        event.actor.display_name or event.actor.email if event.actor else "System",
                        format_html(
                            "<span style='color:#666;'>{}</span>",
                            event.metadata,
                        ),
                    )
                    for event in obj.history.all()
                ),
            ),
        )
