from django import forms

from .models import BusinessClaim


class BusinessClaimAdminForm(forms.ModelForm):
    review_checklist = forms.MultipleChoiceField(
        choices=BusinessClaim.REVIEW_CHECKLIST_OPTIONS,
        required=False,
        widget=forms.CheckboxSelectMultiple,
    )

    class Meta:
        model = BusinessClaim
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["review_checklist"].initial = self.instance.review_checklist

    def clean_review_checklist(self):
        return list(self.cleaned_data.get("review_checklist") or [])

    def clean(self):
        cleaned_data = super().clean()
        status = cleaned_data.get("status")
        review_checklist = cleaned_data.get("review_checklist") or []
        decision_reason_code = cleaned_data.get("decision_reason_code")

        if status in {
            BusinessClaim.VerificationStatus.VERIFIED,
            BusinessClaim.VerificationStatus.REJECTED,
        } and not review_checklist:
            self.add_error(
                "review_checklist",
                "Select at least one reviewer check before recording a decision.",
            )

        if (
            status == BusinessClaim.VerificationStatus.REJECTED
            and not decision_reason_code
        ):
            self.add_error(
                "decision_reason_code",
                "Choose the primary reason this claim was rejected.",
            )

        return cleaned_data
