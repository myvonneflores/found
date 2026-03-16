from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db import utils as db_utils
from django.db.models.functions import Coalesce
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
        latest_claim = self.latest_business_claim
        if latest_claim:
            return latest_claim.status
        return None

    @property
    def latest_business_claim(self):
        return (
            self.business_claims.annotate(
                current_activity_at=Coalesce("resubmitted_at", "submitted_at")
            )
            .order_by("-current_activity_at", "-pk")
            .first()
        )

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
    class ClaimIntent(models.TextChoices):
        EXISTING = "existing", "Claim existing business"
        NEW = "new", "Add new business"

    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"

    class DecisionReasonCode(models.TextChoices):
        INSUFFICIENT_CONNECTION = "insufficient_connection", "We could not confirm your connection to the business"
        MISSING_COMPANY_MATCH = "missing_company_match", "We need a clearer match to the company profile"
        MISSING_CONTACT_DETAILS = "missing_contact_details", "We need more business contact details"
        INCOMPLETE_SUBMISSION = "incomplete_submission", "The verification submission is incomplete"
        OTHER = "other", "Other"

    REVIEW_CHECKLIST_OPTIONS = (
        ("email_matches_domain", "Business email matches the company domain"),
        ("website_matches_brand", "Website or social links match the business brand"),
        ("role_is_clear", "Submitter role clearly explains ownership or management authority"),
        ("context_is_sufficient", "Manual review found enough context to evaluate the claim"),
    )

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
    intent = models.CharField(
        max_length=20,
        choices=ClaimIntent.choices,
        default=ClaimIntent.EXISTING,
    )
    status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )
    business_name = models.CharField(max_length=255)
    submitter_first_name = models.CharField(max_length=120, blank=True)
    submitter_last_name = models.CharField(max_length=120, blank=True)
    business_email = models.EmailField()
    business_phone = models.CharField(max_length=50, blank=True)
    website = models.URLField(blank=True)
    instagram_handle = models.CharField(max_length=100, blank=True)
    facebook_page = models.URLField(blank=True)
    linkedin_page = models.URLField(blank=True)
    role_title = models.CharField(max_length=120, blank=True)
    claim_message = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    resubmitted_at = models.DateTimeField(null=True, blank=True)
    resubmission_count = models.PositiveIntegerField(default=0)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_business_claims",
    )
    decision_reason_code = models.CharField(
        max_length=40,
        choices=DecisionReasonCode.choices,
        blank=True,
    )
    review_checklist = models.JSONField(default=list, blank=True)
    review_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-submitted_at", "-pk"]

    def __str__(self):
        return f"{self.business_name} ({self.get_status_display()})"

    @property
    def review_checklist_labels(self):
        labels = dict(self.REVIEW_CHECKLIST_OPTIONS)
        return [labels[item] for item in self.review_checklist if item in labels]

    def append_history_event(self, event_type, *, actor=None, metadata=None):
        try:
            return self.history.create(
                event_type=event_type,
                actor=actor,
                metadata=metadata or {},
            )
        except db_utils.ProgrammingError:
            return None
        except db_utils.OperationalError:
            return None
        except Exception:
            # Any other exception likely occurs because the history table is missing in an early migration run.
            return None


class BusinessClaimEvent(models.Model):
    class EventType(models.TextChoices):
        SUBMITTED = "submitted", "Submitted"
        RESUBMITTED = "resubmitted", "Resubmitted"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    claim = models.ForeignKey(
        BusinessClaim,
        on_delete=models.CASCADE,
        related_name="history",
    )
    event_type = models.CharField(max_length=20, choices=EventType.choices)
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="business_claim_events",
    )
    occurred_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["occurred_at", "pk"]

    def __str__(self):
        return f"{self.claim.business_name}: {self.get_event_type_display()}"
