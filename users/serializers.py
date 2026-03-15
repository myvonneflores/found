from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import BusinessClaim, PersonalProfile

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    is_business_verified = serializers.SerializerMethodField()
    verification_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "display_name",
            "public_slug",
            "account_type",
            "onboarding_completed",
            "is_business_verified",
            "verification_status",
        )
        read_only_fields = ("id", "email", "account_type", "public_slug", "is_business_verified", "verification_status")

    def get_is_business_verified(self, obj):
        return obj.is_business_verified

    def get_verification_status(self, obj):
        return obj.business_verification_status


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

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
            "onboarding_completed",
        )
        read_only_fields = ("id", "public_slug")

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class PersonalProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonalProfile
        fields = ("bio", "avatar_url", "location", "is_public")


class BusinessClaimSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    company_slug = serializers.CharField(source="company.slug", read_only=True)

    class Meta:
        model = BusinessClaim
        fields = (
            "id",
            "company",
            "company_name",
            "company_slug",
            "status",
            "business_name",
            "business_email",
            "business_phone",
            "website",
            "instagram_handle",
            "facebook_page",
            "linkedin_page",
            "role_title",
            "claim_message",
            "review_notes",
            "submitted_at",
            "reviewed_at",
        )
        read_only_fields = ("id", "status", "review_notes", "submitted_at", "reviewed_at")

    def validate(self, attrs):
        user = self.context["request"].user
        if user.account_type != User.AccountType.BUSINESS:
            raise serializers.ValidationError("Only business users can create business claims.")
        return attrs

    def create(self, validated_data):
        return BusinessClaim.objects.create(user=self.context["request"].user, **validated_data)


class BusinessClaimUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessClaim
        fields = (
            "company",
            "business_name",
            "business_email",
            "business_phone",
            "website",
            "instagram_handle",
            "facebook_page",
            "linkedin_page",
            "role_title",
            "claim_message",
        )

    def validate(self, attrs):
        claim = self.instance
        if claim.status == BusinessClaim.VerificationStatus.VERIFIED:
            raise serializers.ValidationError("Verified claims cannot be edited.")
        return attrs


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
    bio = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    public_lists = serializers.SerializerMethodField()
    public_recommendations = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "display_name",
            "public_slug",
            "account_type",
            "bio",
            "location",
            "avatar_url",
            "public_lists",
            "public_recommendations",
        )

    def get_bio(self, obj):
        if obj.account_type != User.AccountType.PERSONAL:
            return ""
        profile = getattr(obj, "personal_profile", None)
        if profile and profile.is_public:
            return profile.bio
        return ""

    def get_location(self, obj):
        if obj.account_type != User.AccountType.PERSONAL:
            return ""
        profile = getattr(obj, "personal_profile", None)
        if profile and profile.is_public:
            return profile.location
        return ""

    def get_avatar_url(self, obj):
        if obj.account_type != User.AccountType.PERSONAL:
            return ""
        profile = getattr(obj, "personal_profile", None)
        if profile and profile.is_public:
            return profile.avatar_url
        return ""

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
