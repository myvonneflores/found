from django.db import utils as db_utils
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from companies.creation import normalized_hostname
from companies.models import Company

from .models import BusinessClaim, BusinessClaimEvent, PersonalProfile, business_claim_history_table_exists
from .display_names import (
    build_display_name_suggestions,
    derive_personal_display_name,
    normalize_display_name,
)

User = get_user_model()


def get_user_badges(user):
    badges = []
    if user.has_community_contributions:
        badges.append(
            {
                "slug": "community-contributor",
                "label": "Community Contributor",
            }
        )
    return badges


def is_personal_display_name_taken(display_name, *, exclude_user_id=None):
    normalized_name = normalize_display_name(display_name)
    if not normalized_name:
        return False

    queryset = User.objects.filter(
        account_type=User.AccountType.PERSONAL,
        display_name__iexact=normalized_name,
    )
    if exclude_user_id is not None:
        queryset = queryset.exclude(pk=exclude_user_id)
    return queryset.exists()


def validate_personal_display_name(display_name, *, exclude_user_id=None):
    normalized_name = normalize_display_name(display_name)
    if not normalized_name:
        raise serializers.ValidationError("Enter a display name.")

    if is_personal_display_name_taken(normalized_name, exclude_user_id=exclude_user_id):
        raise serializers.ValidationError("That display name is already taken.")

    return normalized_name


def _claim_target_company(attrs, instance=None):
    if "company" in attrs:
        return attrs.get("company")
    if instance is not None:
        return instance.company
    return None


def _claim_target_intent(attrs, instance=None):
    if "intent" in attrs:
        return attrs["intent"]
    if instance is not None:
        return instance.intent
    return BusinessClaim.ClaimIntent.EXISTING


def _claim_target_business_name(attrs, instance=None):
    if "business_name" in attrs:
        return attrs["business_name"].strip()
    if instance is not None:
        return instance.business_name.strip()
    return ""


def find_existing_company_for_new_claim(*, website: str):
    hostname = normalized_hostname(website)
    if not hostname:
        return None

    for company in Company.objects.exclude(website=""):
        if normalized_hostname(company.website) == hostname:
            return company

    return None


def validate_business_claim_attrs(*, attrs, user, instance=None):
    if user.account_type != User.AccountType.BUSINESS:
        raise serializers.ValidationError("Only business users can create business claims.")

    intent = _claim_target_intent(attrs, instance)
    company = _claim_target_company(attrs, instance)
    business_name = _claim_target_business_name(attrs, instance)

    if not attrs.get("submitter_first_name", getattr(instance, "submitter_first_name", "")).strip():
        raise serializers.ValidationError({"submitter_first_name": "Enter the first name of the person submitting this claim."})
    if not attrs.get("submitter_last_name", getattr(instance, "submitter_last_name", "")).strip():
        raise serializers.ValidationError({"submitter_last_name": "Enter the last name of the person submitting this claim."})
    if not attrs.get("role_title", getattr(instance, "role_title", "")).strip():
        raise serializers.ValidationError({"role_title": "Tell us the submitter's role at the business."})

    if intent == BusinessClaim.ClaimIntent.EXISTING and company is None:
        raise serializers.ValidationError({"company": "Select the existing FOUND company profile you want to claim."})

    if intent == BusinessClaim.ClaimIntent.NEW and company is not None:
        raise serializers.ValidationError({"company": "New business claims cannot target an existing company profile."})

    website = attrs.get("website", getattr(instance, "website", "")).strip()
    if intent == BusinessClaim.ClaimIntent.NEW and not website:
        raise serializers.ValidationError({"website": "Add the business website before starting a new business claim."})

    if intent == BusinessClaim.ClaimIntent.NEW:
        existing_company = find_existing_company_for_new_claim(website=website)
        if existing_company is not None:
            raise serializers.ValidationError(
                {
                    "website": (
                        "A FOUND business listing already uses this website. "
                        "Choose 'Claim an existing business' and search for that listing instead."
                    )
                }
            )

    duplicate_queryset = user.business_claims.all()
    if instance is not None:
        duplicate_queryset = duplicate_queryset.exclude(pk=instance.pk)

    if intent == BusinessClaim.ClaimIntent.EXISTING and company is not None:
        duplicate_queryset = duplicate_queryset.filter(company=company)
    else:
        duplicate_queryset = duplicate_queryset.filter(
            company__isnull=True,
            business_name__iexact=business_name,
        )

    if duplicate_queryset.exists():
        raise serializers.ValidationError(
            "You already have an active verification workflow for this business. Update that claim instead of creating a new one."
        )

    return attrs


class UserSerializer(serializers.ModelSerializer):
    is_business_verified = serializers.SerializerMethodField()
    verification_status = serializers.SerializerMethodField()
    badges = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "display_name",
            "public_slug",
            "needs_display_name_review",
            "account_type",
            "onboarding_completed",
            "is_business_verified",
            "verification_status",
            "badges",
        )
        read_only_fields = (
            "id",
            "email",
            "account_type",
            "public_slug",
            "needs_display_name_review",
            "is_business_verified",
            "verification_status",
            "badges",
        )

    def get_is_business_verified(self, obj):
        return obj.is_business_verified

    def get_verification_status(self, obj):
        return obj.business_verification_status

    def get_badges(self, obj):
        return get_user_badges(obj)

    def validate_display_name(self, value):
        user = self.instance
        normalized_name = normalize_display_name(value)

        if user and user.account_type == User.AccountType.PERSONAL:
            return validate_personal_display_name(
                normalized_name,
                exclude_user_id=user.pk,
            )

        return normalized_name

    def update(self, instance, validated_data):
        display_name = validated_data.get("display_name")
        if (
            instance.account_type == User.AccountType.PERSONAL
            and display_name is not None
            and display_name != instance.display_name
        ):
            validated_data["needs_display_name_review"] = False
        return super().update(instance, validated_data)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    certify_local_ownership = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "password",
            "first_name",
            "last_name",
            "display_name",
            "public_slug",
            "account_type",
            "certify_local_ownership",
            "onboarding_completed",
        )
        read_only_fields = ("id", "public_slug")

    def validate(self, attrs):
        account_type = attrs.get("account_type", User.AccountType.PERSONAL)
        attrs["display_name"] = normalize_display_name(attrs.get("display_name", ""))

        if account_type == User.AccountType.PERSONAL:
            resolved_display_name = derive_personal_display_name(
                attrs.get("display_name", ""),
                attrs.get("first_name", ""),
                attrs.get("email", ""),
            )
            try:
                attrs["display_name"] = validate_personal_display_name(resolved_display_name)
            except serializers.ValidationError as exc:
                raise serializers.ValidationError({"display_name": exc.detail}) from exc

        if account_type == User.AccountType.BUSINESS and not attrs.get("certify_local_ownership", False):
            raise serializers.ValidationError(
                {
                    "certify_local_ownership": "Business accounts must certify that the business they represent is locally owned."
                }
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop("certify_local_ownership", None)
        return User.objects.create_user(**validated_data)


class PersonalProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonalProfile
        fields = ("bio", "avatar_url", "location", "is_public")


class BusinessClaimEventSerializer(serializers.ModelSerializer):
    actor_display = serializers.SerializerMethodField()
    event_label = serializers.SerializerMethodField()

    class Meta:
        model = BusinessClaimEvent
        fields = ("event_type", "event_label", "actor_display", "occurred_at", "metadata")

    def get_actor_display(self, obj):
        if not obj.actor:
            return ""
        return obj.actor.display_name or obj.actor.email

    def get_event_label(self, obj):
        return obj.get_event_type_display()


class BusinessClaimSummarySerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    company_slug = serializers.CharField(source="company.slug", read_only=True)
    website = serializers.CharField(required=False, allow_blank=True)
    decision_reason_label = serializers.SerializerMethodField()
    review_checklist_labels = serializers.SerializerMethodField()

    class Meta:
        model = BusinessClaim
        fields = (
            "id",
            "company",
            "company_name",
            "company_slug",
            "intent",
            "status",
            "business_name",
            "submitter_first_name",
            "submitter_last_name",
            "business_email",
            "business_phone",
            "website",
            "instagram_handle",
            "facebook_page",
            "linkedin_page",
            "role_title",
            "claim_message",
            "decision_reason_code",
            "decision_reason_label",
            "review_checklist",
            "review_checklist_labels",
            "review_notes",
            "resubmitted_at",
            "resubmission_count",
            "submitted_at",
            "reviewed_at",
        )
        read_only_fields = (
            "id",
            "status",
            "decision_reason_code",
            "decision_reason_label",
            "review_checklist",
            "review_checklist_labels",
            "review_notes",
            "resubmitted_at",
            "resubmission_count",
            "submitted_at",
            "reviewed_at",
        )

    def validate_website(self, value):
        value = value.strip()
        if not value:
            return ""
        if "://" not in value:
            value = f"https://{value}"
        return value

    def validate(self, attrs):
        return validate_business_claim_attrs(
            attrs=attrs,
            user=self.context["request"].user,
        )

    def create(self, validated_data):
        claim = BusinessClaim.objects.create(
            user=self.context["request"].user,
            **validated_data,
        )
        claim.append_history_event(
            BusinessClaimEvent.EventType.SUBMITTED,
            actor=self.context["request"].user,
            metadata={
                "intent": claim.intent,
                "company_name": claim.company.name if claim.company else claim.business_name,
            },
        )
        return claim

    def get_decision_reason_label(self, obj):
        if not obj.decision_reason_code:
            return ""
        return obj.get_decision_reason_code_display()

    def get_review_checklist_labels(self, obj):
        return obj.review_checklist_labels


class BusinessClaimSerializer(BusinessClaimSummarySerializer):
    history = serializers.SerializerMethodField()

    class Meta(BusinessClaimSummarySerializer.Meta):
        fields = BusinessClaimSummarySerializer.Meta.fields + ("history",)
        read_only_fields = BusinessClaimSummarySerializer.Meta.read_only_fields + ("history",)

    def get_history(self, obj):
        if not business_claim_history_table_exists():
            return []

        try:
            return BusinessClaimEventSerializer(obj.history.all(), many=True).data
        except (db_utils.ProgrammingError, db_utils.OperationalError):
            return []


class BusinessClaimUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessClaim
        fields = (
            "company",
            "intent",
            "business_name",
            "submitter_first_name",
            "submitter_last_name",
            "business_email",
            "business_phone",
            "website",
            "instagram_handle",
            "facebook_page",
            "linkedin_page",
            "role_title",
            "claim_message",
        )

    def validate_website(self, value):
        value = value.strip()
        if not value:
            return ""
        if "://" not in value:
            value = f"https://{value}"
        return value

    def validate(self, attrs):
        claim = self.instance
        if claim.status == BusinessClaim.VerificationStatus.VERIFIED:
            raise serializers.ValidationError("Verified claims cannot be edited.")
        return validate_business_claim_attrs(
            attrs=attrs,
            user=self.context["request"].user,
            instance=claim,
        )

    def update(self, instance, validated_data):
        previous_status = instance.status
        previous_reason = instance.decision_reason_code
        previous_notes = instance.review_notes
        previous_checklist = list(instance.review_checklist)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        update_fields = list(validated_data.keys())

        if previous_status == BusinessClaim.VerificationStatus.REJECTED:
            instance.status = BusinessClaim.VerificationStatus.PENDING
            instance.decision_reason_code = ""
            instance.review_checklist = []
            instance.review_notes = ""
            instance.reviewed_at = None
            instance.reviewed_by = None
            instance.resubmission_count += 1
            instance.resubmitted_at = timezone.now()
            update_fields.extend(
                [
                    "status",
                    "decision_reason_code",
                    "review_checklist",
                    "review_notes",
                    "reviewed_at",
                    "reviewed_by",
                    "resubmission_count",
                    "resubmitted_at",
                ]
            )

        instance.save(update_fields=list(dict.fromkeys(update_fields)))

        if previous_status == BusinessClaim.VerificationStatus.REJECTED:
            instance.append_history_event(
                BusinessClaimEvent.EventType.RESUBMITTED,
                actor=self.context["request"].user,
                metadata={
                    "previous_decision_reason_code": previous_reason,
                    "previous_review_notes": previous_notes,
                    "previous_review_checklist": previous_checklist,
                },
            )

        return instance


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.EMAIL_FIELD

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["account_type"] = user.account_type
        token["is_business_verified"] = user.is_business_verified
        token["verification_status"] = user.business_verification_status
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class PublicProfileSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    business_company_slug = serializers.SerializerMethodField()
    public_lists = serializers.SerializerMethodField()
    public_recommendations = serializers.SerializerMethodField()
    badges = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "display_name",
            "public_slug",
            "account_type",
            "bio",
            "location",
            "avatar_url",
            "business_company_slug",
            "badges",
            "public_lists",
            "public_recommendations",
        )

    def get_display_name(self, obj):
        return obj.display_name or obj.first_name or obj.email.split("@")[0]

    def _get_personal_profile(self, obj):
        return getattr(obj, "personal_profile", None)

    def get_bio(self, obj):
        profile = self._get_personal_profile(obj)
        return profile.bio if profile else ""

    def get_location(self, obj):
        profile = self._get_personal_profile(obj)
        return profile.location if profile else ""

    def get_avatar_url(self, obj):
        profile = self._get_personal_profile(obj)
        return profile.avatar_url if profile else ""

    def get_business_company_slug(self, obj):
        verified_claim = (
            obj.business_claims.filter(status=BusinessClaim.VerificationStatus.VERIFIED, company__isnull=False)
            .select_related("company")
            .order_by("submitted_at", "pk")
            .first()
        )
        if not verified_claim or not verified_claim.company:
            return None
        return verified_claim.company.slug

    def get_badges(self, obj):
        return get_user_badges(obj)

    def get_public_lists(self, obj):
        from community.serializers import PublicCuratedListSerializer

        public_lists = obj.curated_lists.filter(is_public=True).prefetch_related(
            "items__company__product_categories",
            "items__company__ownership_markers",
            "items__company__sustainability_markers",
        )
        return PublicCuratedListSerializer(public_lists, many=True).data

    def get_public_recommendations(self, obj):
        from community.serializers import PublicRecommendationSerializer

        recommendations = obj.recommendations.filter(is_public=True).select_related(
            "company", "company__business_category"
        ).prefetch_related(
            "company__product_categories",
            "company__ownership_markers",
            "company__sustainability_markers",
        )
        return PublicRecommendationSerializer(recommendations, many=True).data


class DisplayNameAvailabilitySerializer(serializers.Serializer):
    available = serializers.BooleanField()
    suggestions = serializers.ListField(child=serializers.CharField(), allow_empty=True)


def get_display_name_availability(*, display_name, exclude_user_id=None):
    normalized_name = normalize_display_name(display_name)
    if not normalized_name:
        return {"available": False, "suggestions": []}

    available = not is_personal_display_name_taken(
        normalized_name,
        exclude_user_id=exclude_user_id,
    )
    suggestions = (
        []
        if available
        else build_display_name_suggestions(
            normalized_name,
            is_taken=lambda candidate: is_personal_display_name_taken(
                candidate,
                exclude_user_id=exclude_user_id,
            ),
        )
    )

    return {"available": available, "suggestions": suggestions}
