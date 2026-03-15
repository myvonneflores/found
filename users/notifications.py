from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

from .models import BusinessClaim


def send_business_claim_status_email(claim: BusinessClaim):
    if claim.status not in {
        BusinessClaim.VerificationStatus.VERIFIED,
        BusinessClaim.VerificationStatus.REJECTED,
    }:
        return

    template_key = (
        "approved"
        if claim.status == BusinessClaim.VerificationStatus.VERIFIED
        else "rejected"
    )
    context = {
        "claim": claim,
        "company_name": claim.company.name if claim.company else claim.business_name,
        "decision_reason_label": claim.get_decision_reason_code_display()
        if claim.decision_reason_code
        else "",
        "review_checklist_labels": claim.review_checklist_labels,
    }
    subject = render_to_string(
        f"users/emails/business_claim_{template_key}_subject.txt", context
    ).strip()
    body = render_to_string(
        f"users/emails/business_claim_{template_key}_body.txt", context
    )
    send_mail(
        subject,
        body,
        settings.DEFAULT_FROM_EMAIL,
        [claim.business_email],
        fail_silently=False,
    )
