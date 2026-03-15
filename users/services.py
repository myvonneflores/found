from django.utils import timezone

from .models import BusinessClaim, BusinessClaimEvent
from .notifications import send_business_claim_status_email


def normalize_review_checklist(values):
    valid_codes = {code for code, _label in BusinessClaim.REVIEW_CHECKLIST_OPTIONS}
    normalized = []
    for value in values or []:
        if value in valid_codes and value not in normalized:
            normalized.append(value)
    return normalized


def review_business_claim(
    claim: BusinessClaim,
    *,
    reviewer,
    status: str,
    decision_reason_code: str = "",
    review_checklist=None,
    review_notes: str = "",
):
    if status not in {
        BusinessClaim.VerificationStatus.VERIFIED,
        BusinessClaim.VerificationStatus.REJECTED,
    }:
        raise ValueError("Business claims can only be reviewed as verified or rejected.")

    normalized_checklist = normalize_review_checklist(review_checklist)
    decision_reason = (
        decision_reason_code
        if status == BusinessClaim.VerificationStatus.REJECTED
        else ""
    )

    claim.status = status
    claim.reviewed_at = timezone.now()
    claim.reviewed_by = reviewer
    claim.decision_reason_code = decision_reason
    claim.review_checklist = normalized_checklist
    claim.review_notes = review_notes
    claim.save(
        update_fields=[
            "status",
            "reviewed_at",
            "reviewed_by",
            "decision_reason_code",
            "review_checklist",
            "review_notes",
        ]
    )

    event_type = (
        BusinessClaimEvent.EventType.APPROVED
        if status == BusinessClaim.VerificationStatus.VERIFIED
        else BusinessClaimEvent.EventType.REJECTED
    )
    claim.append_history_event(
        event_type,
        actor=reviewer,
        metadata={
            "decision_reason_code": decision_reason,
            "review_checklist": normalized_checklist,
            "review_notes": review_notes,
        },
    )
    send_business_claim_status_email(claim)
