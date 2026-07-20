from django.contrib import admin
from django.utils.html import format_html
from .models import Profile, Event, EventCategory, Registration, ContactMessage, SponsorInquiry


class EventCategoryInline(admin.TabularInline):
    model = EventCategory
    extra = 1


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "event_date", "is_open_for_registration", "early_bird_active")
    prepopulated_fields = {"slug": ("name",)}
    inlines = [EventCategoryInline]


@admin.register(Registration)
class RegistrationAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "phone", "event", "category", "amount", "status", "bib_number", "created_at")
    list_filter = ("event", "category", "status")
    search_fields = ("name", "email", "phone", "bib_number")


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "phone", "created_at", "handled")
    list_filter = ("handled",)
    search_fields = ("name", "email", "phone", "message")


@admin.register(SponsorInquiry)
class SponsorInquiryAdmin(admin.ModelAdmin):
    list_display = (
        "company_name", "contact_person", "business_email", "mobile_number",
        "sponsorship_category", "budget_range", "status", "created_at",
    )
    list_filter = ("status", "sponsorship_category", "industry_type", "budget_range")
    search_fields = ("company_name", "contact_person", "business_email", "mobile_number", "city")
    list_editable = ("status",)
    readonly_fields = ("created_at", "logo_preview", "brochure_link", "proposal_link")
    date_hierarchy = "created_at"

    fieldsets = (
        ("Status", {"fields": ("status", "created_at")}),
        ("Company & Contact", {
            "fields": (
                "company_name", "contact_person", "designation",
                "business_email", "mobile_number", "website",
                "company_address", "city", "state", "country",
            )
        }),
        ("Sponsorship Details", {
            "fields": ("industry_type", "sponsorship_category", "budget_range", "events_interested"),
        }),
        ("More About The Company", {
            "fields": ("company_description", "marketing_objectives", "additional_requirements"),
        }),
        ("Uploaded Files", {
            "fields": (
                "company_logo", "logo_preview",
                "company_brochure", "brochure_link",
                "sponsorship_proposal", "proposal_link",
            ),
        }),
        ("Agreement", {"fields": ("agreed_to_terms",)}),
    )

    def logo_preview(self, obj):
        if obj.company_logo:
            return format_html('<img src="{}" style="max-height:80px;border-radius:6px;" />', obj.company_logo.url)
        return "—"
    logo_preview.short_description = "Logo preview"

    def brochure_link(self, obj):
        if obj.company_brochure:
            return format_html('<a href="{}" target="_blank">Download brochure</a>', obj.company_brochure.url)
        return "—"
    brochure_link.short_description = "Brochure file"

    def proposal_link(self, obj):
        if obj.sponsorship_proposal:
            return format_html('<a href="{}" target="_blank">Download proposal</a>', obj.sponsorship_proposal.url)
        return "—"
    proposal_link.short_description = "Proposal file"


admin.site.register(Profile)
