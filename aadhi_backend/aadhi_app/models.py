from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Profile(models.Model):
    """Extra fields for the built-in Django User (phone number)."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    phone = models.CharField(max_length=15, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Profile({self.user.username})"


class Event(models.Model):
    """A race/event that people can register for (e.g. Bengaluru Corporate Wellness Run)."""
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=200)
    location = models.CharField(max_length=200, blank=True)
    event_date = models.DateTimeField()
    early_bird_deadline = models.DateTimeField(null=True, blank=True)
    is_open_for_registration = models.BooleanField(default=True)

    def __str__(self):
        return self.name

    @property
    def early_bird_active(self):
        if not self.early_bird_deadline:
            return False
        return timezone.now() <= self.early_bird_deadline


class EventCategory(models.Model):
    """A race category within an event, e.g. '3 KM Fun Run' with regular/early-bird pricing."""
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="categories")
    name = models.CharField(max_length=100)
    price_regular = models.DecimalField(max_digits=8, decimal_places=2)
    price_early_bird = models.DecimalField(max_digits=8, decimal_places=2)

    class Meta:
        verbose_name_plural = "Event categories"
        unique_together = ("event", "name")

    def __str__(self):
        return f"{self.event.name} — {self.name}"

    def current_price(self):
        return self.price_early_bird if self.event.early_bird_active else self.price_regular


class Registration(models.Model):
    """A single participant's registration + (mock) payment record for an event category."""

    STATUS_PENDING = "pending"
    STATUS_PAID = "paid"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_PAID, "Paid"),
        (STATUS_FAILED, "Failed"),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="registrations")
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="registrations")
    category = models.ForeignKey(EventCategory, on_delete=models.CASCADE, related_name="registrations")

    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=15)
    address = models.TextField()

    amount = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)
    bib_number = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # ===== Payment Reference (demo mode — no real gateway) =====
    # Field names kept as-is to avoid a migration; they now store locally
    # generated demo order/payment references instead of real Razorpay ids.
    razorpay_order_id = models.CharField(max_length=200, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=200, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)  # unused in demo mode

    # ===== QR Code =====
    qr_code = models.ImageField(upload_to="qrcodes/", blank=True, null=True)

    # ===== Payment Date =====
    payment_date = models.DateTimeField(blank=True, null=True)

    # ===== Event Check-in =====
    checked_in = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} — {self.category} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.bib_number and self.status == self.STATUS_PAID:
            self.bib_number = f"AADHI-{self.event.slug[:3].upper()}-{self.pk or Registration.objects.count() + 1:04d}"
        super().save(*args, **kwargs)


class SponsorInquiry(models.Model):
    """A sponsorship request submitted through the 'Become a Sponsor' page."""

    INDUSTRY_CHOICES = [
        ("corporate", "Corporate"),
        ("startup", "Startup"),
        ("healthcare", "Healthcare"),
        ("education", "Education"),
        ("fitness", "Fitness"),
        ("it", "IT"),
        ("retail", "Retail"),
        ("real_estate", "Real Estate"),
        ("banking", "Banking"),
        ("ngo", "NGO"),
        ("government", "Government"),
        ("other", "Other"),
    ]

    SPONSORSHIP_CATEGORY_CHOICES = [
        ("title", "Title Sponsor"),
        ("gold", "Gold Sponsor"),
        ("silver", "Silver Sponsor"),
        ("bronze", "Bronze Sponsor"),
        ("custom", "Custom Sponsorship"),
    ]

    BUDGET_CHOICES = [
        ("50k_1l", "₹50,000 - ₹1,00,000"),
        ("1l_5l", "₹1,00,000 - ₹5,00,000"),
        ("5l_10l", "₹5,00,000 - ₹10,00,000"),
        ("10l_plus", "₹10,00,000+"),
        ("custom", "Custom Budget"),
    ]

    EVENT_INTEREST_CHOICES = [
        ("marathon", "Marathon"),
        ("corporate_event", "Corporate Event"),
        ("entertainment_show", "Entertainment Show"),
        ("sports_event", "Sports Event"),
        ("college_fest", "College Fest"),
        ("music_concert", "Music Concert"),
        ("csr_program", "CSR Program"),
        ("other", "Other"),
    ]

    STATUS_NEW = "new"
    STATUS_REVIEWING = "reviewing"
    STATUS_CONTACTED = "contacted"
    STATUS_CONFIRMED = "confirmed"
    STATUS_DECLINED = "declined"
    STATUS_CHOICES = [
        (STATUS_NEW, "New"),
        (STATUS_REVIEWING, "Under Review"),
        (STATUS_CONTACTED, "Contacted"),
        (STATUS_CONFIRMED, "Confirmed"),
        (STATUS_DECLINED, "Declined"),
    ]

    # ===== Company / contact details =====
    company_name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=150)
    designation = models.CharField(max_length=150)
    business_email = models.EmailField()
    mobile_number = models.CharField(max_length=15)
    website = models.URLField(blank=True)
    company_address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)

    # ===== Sponsorship details =====
    industry_type = models.CharField(max_length=20, choices=INDUSTRY_CHOICES, blank=True)
    sponsorship_category = models.CharField(max_length=20, choices=SPONSORSHIP_CATEGORY_CHOICES, blank=True)
    budget_range = models.CharField(max_length=20, choices=BUDGET_CHOICES, blank=True)
    events_interested = models.CharField(max_length=500, blank=True)

    # ===== Free-text details =====
    company_description = models.TextField(blank=True)
    marketing_objectives = models.TextField(blank=True)
    additional_requirements = models.TextField(blank=True)

    # ===== Uploads (visible/downloadable from Django admin) =====
    company_logo = models.ImageField(upload_to="sponsors/logos/", blank=True, null=True)
    company_brochure = models.FileField(upload_to="sponsors/brochures/", blank=True, null=True)
    sponsorship_proposal = models.FileField(upload_to="sponsors/proposals/", blank=True, null=True)

    agreed_to_terms = models.BooleanField(default=False)

    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_NEW)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Sponsor Inquiry"
        verbose_name_plural = "Sponsor Inquiries"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.company_name} — {self.get_sponsorship_category_display() or 'Sponsorship Inquiry'}"

    def get_events_interested_list(self):
        return [e.strip() for e in self.events_interested.split(",") if e.strip()]


class ContactMessage(models.Model):
    """Message submitted through the site contact form."""
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=15)
    email = models.EmailField()
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    handled = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} <{self.email}>"
    

