from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.text import slugify

from .managers import UserManager


class User(AbstractUser):
    class AccountType(models.TextChoices):
        PERSONAL = "personal", "Personal"
        BUSINESS = "business", "Business"

    username = None
    email = models.EmailField("email address", unique=True)
    account_type = models.CharField(
        max_length=20,
        choices=AccountType.choices,
        default=AccountType.PERSONAL,
    )
    display_name = models.CharField(max_length=120, blank=True)
    public_slug = models.SlugField(max_length=140, unique=True, blank=True, null=True)
    onboarding_completed = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    @property
    def is_business_verified(self):
        if self.account_type != self.AccountType.BUSINESS:
            return False
        return self.business_claims.filter(status=BusinessClaim.VerificationStatus.VERIFIED).exists()

    @property
    def can_use_community_features(self):
        return self.account_type in {self.AccountType.PERSONAL, self.AccountType.BUSINESS}

    @property
    def business_verification_status(self):
        if self.account_type != self.AccountType.BUSINESS:
            return None
        if self.is_business_verified:
            return BusinessClaim.VerificationStatus.VERIFIED
        latest_claim = self.business_claims.order_by("-submitted_at", "-pk").first()
        if latest_claim:
            return latest_claim.status
        return None

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        if not self.public_slug:
            base_value = self.display_name or self.first_name or self.email.split("@")[0]
            base_slug = slugify(base_value) or "found-member"
            slug = base_slug
            counter = 2
            while User.objects.exclude(pk=self.pk).filter(public_slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.public_slug = slug
        super().save(*args, **kwargs)


class PersonalProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="personal_profile",
    )
    bio = models.TextField(blank=True)
    avatar_url = models.URLField(blank=True)
    location = models.CharField(max_length=120, blank=True)
    is_public = models.BooleanField(default=False)

    def __str__(self):
        return f"Personal profile for {self.user.email}"


class BusinessClaim(models.Model):
    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="business_claims",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="business_claims",
    )
    status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )
    business_name = models.CharField(max_length=255)
    business_email = models.EmailField()
    business_phone = models.CharField(max_length=50, blank=True)
    website = models.URLField(blank=True)
    instagram_handle = models.CharField(max_length=100, blank=True)
    facebook_page = models.URLField(blank=True)
    linkedin_page = models.URLField(blank=True)
    role_title = models.CharField(max_length=120, blank=True)
    claim_message = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_business_claims",
    )
    review_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-submitted_at", "-pk"]

    def __str__(self):
        return f"{self.business_name} ({self.get_status_display()})"
