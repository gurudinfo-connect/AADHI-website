import re

from django import forms

from .models import SponsorInquiry

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PHONE_RE = re.compile(r"^[6-9]\d{9}$")


class SponsorInquiryForm(forms.ModelForm):
    """
    Backs the 'Become a Sponsor' page. Rendered with hand-written markup in
    sponsor.html (to match the site's existing design system exactly), but
    validated and saved through this ModelForm like any normal Django form.
    """

    events_interested = forms.MultipleChoiceField(
        choices=SponsorInquiry.EVENT_INTEREST_CHOICES,
        widget=forms.CheckboxSelectMultiple,
        required=False,
        label="Event(s) Interested In",
    )
    agreed_to_terms = forms.BooleanField(
        required=True,
        error_messages={"required": "Please agree to the sponsorship terms and conditions."},
    )

    class Meta:
        model = SponsorInquiry
        fields = [
            "company_name",
            "contact_person",
            "designation",
            "business_email",
            "mobile_number",
            "website",
            "company_address",
            "city",
            "state",
            "country",
            "industry_type",
            "sponsorship_category",
            "budget_range",
            "events_interested",
            "company_description",
            "marketing_objectives",
            "additional_requirements",
            "company_logo",
            "company_brochure",
            "sponsorship_proposal",
            "agreed_to_terms",
        ]

    def clean_business_email(self):
        email = (self.cleaned_data.get("business_email") or "").strip().lower()
        if not email or not EMAIL_RE.match(email):
            raise forms.ValidationError("Please enter a valid business email address.")
        return email

    def clean_mobile_number(self):
        raw = (self.cleaned_data.get("mobile_number") or "").strip()
        digits = re.sub(r"\D", "", raw)[-10:]
        if not digits or not PHONE_RE.match(digits):
            raise forms.ValidationError("Please enter a valid 10-digit mobile number.")
        return digits

    def clean_company_name(self):
        value = (self.cleaned_data.get("company_name") or "").strip()
        if not value:
            raise forms.ValidationError("Please enter your company name.")
        return value

    def clean_contact_person(self):
        value = (self.cleaned_data.get("contact_person") or "").strip()
        if not value:
            raise forms.ValidationError("Please enter the contact person's name.")
        return value

    def clean_designation(self):
        value = (self.cleaned_data.get("designation") or "").strip()
        if not value:
            raise forms.ValidationError("Please enter the contact person's designation.")
        return value

    def save(self, commit=True):
        instance = super().save(commit=False)
        instance.events_interested = ", ".join(self.cleaned_data.get("events_interested", []))
        if commit:
            instance.save()
        return instance
