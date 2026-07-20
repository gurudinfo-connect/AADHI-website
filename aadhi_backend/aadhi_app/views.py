import json
import logging
import re
import uuid

from django.contrib.auth import authenticate, login, logout
from django.utils import timezone
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from django.contrib import messages

from django.conf import settings

from .models import Event, EventCategory, Registration, ContactMessage, Profile, SponsorInquiry
from .forms import SponsorInquiryForm
import qrcode

from io import BytesIO

from django.core.files import File
from django.views.decorators.csrf import csrf_exempt

from django.core.mail import EmailMessage

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PHONE_RE = re.compile(r"^[6-9]\d{9}$")


def _json_body(request):
    try:
        return json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return {}


def _user_payload(user):
    if not user or not user.is_authenticated:
        return None
    phone = ""
    try:
        phone = user.profile.phone
    except Profile.DoesNotExist:
        pass
    return {
        "name": user.get_full_name() or user.username,
        "email": user.email,
        "phone": phone,
    }


# ---------------------------------------------------------------------------
# Page views — these just render the original site pages as Django templates.
# ensure_csrf_cookie guarantees the browser has a csrftoken cookie so the
# front-end JS (auth.js / script.js / upcoming-event.js) can call the JSON
# API below.
# ---------------------------------------------------------------------------

@ensure_csrf_cookie
def index_view(request):
    return render(request, "index.html")


@ensure_csrf_cookie
def signin_view(request):
    return render(request, "signin.html")


@ensure_csrf_cookie
def signup_view(request):
    return render(request, "signup.html")


@ensure_csrf_cookie
def amaravati_view(request):
    return render(request, "amaravati.html")


@ensure_csrf_cookie
def telangana_view(request):
    return render(request, "telangana.html")


@ensure_csrf_cookie
def bengaluru_event_view(request):
    return render(request, "bengaluru-corporate-wellness-run.html")


# ---------------------------------------------------------------------------
# JSON API
# ---------------------------------------------------------------------------

@require_http_methods(["POST"])
def api_signup(request):
    data = _json_body(request)
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("phone") or "").strip()
    password = data.get("password") or ""
    confirm = data.get("confirm") or ""

    errors = {}
    if not name:
        errors["name"] = "Please enter your full name."
    if not email or not EMAIL_RE.match(email):
        errors["email"] = "Please enter a valid email address."
    elif User.objects.filter(email__iexact=email).exists():
        errors["email"] = "An account with this email already exists."
    digits = re.sub(r"\D", "", phone)[-10:]
    if not digits or not PHONE_RE.match(digits):
        errors["phone"] = "Please enter a valid 10-digit mobile number."
    if not password or len(password) < 6:
        errors["password"] = "Password must be at least 6 characters."
    if confirm != password:
        errors["confirm"] = "Passwords do not match."

    if errors:
        return JsonResponse({"ok": False, "errors": errors}, status=400)

    username = email
    user = User.objects.create_user(username=username, email=email, password=password)
    name_parts = name.split(" ", 1)
    user.first_name = name_parts[0]
    user.last_name = name_parts[1] if len(name_parts) > 1 else ""
    user.save()
    Profile.objects.create(user=user, phone=digits)

    login(request, user)
    return JsonResponse({"ok": True, "user": _user_payload(user)})


@require_http_methods(["POST"])
def api_login(request):
    data = _json_body(request)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    errors = {}
    if not email or not EMAIL_RE.match(email):
        errors["email"] = "Please enter a valid email address."
    if not password:
        errors["password"] = "Please enter your password."
    if errors:
        return JsonResponse({"ok": False, "errors": errors}, status=400)

    user = authenticate(request, username=email, password=password)
    if user is None:
        return JsonResponse(
            {"ok": False, "errors": {"password": "Incorrect email or password."}},
            status=400,
        )

    login(request, user)
    return JsonResponse({"ok": True, "user": _user_payload(user)})


@require_http_methods(["POST"])
def api_logout(request):
    logout(request)
    return JsonResponse({"ok": True})


def api_me(request):
    return JsonResponse({"ok": True, "user": _user_payload(request.user)})


@require_http_methods(["GET"])
def api_events(request):
    payload = []
    for event in Event.objects.prefetch_related("categories"):
        payload.append({
            "slug": event.slug,
            "name": event.name,
            "location": event.location,
            "event_date": event.event_date.isoformat(),
            "early_bird_active": event.early_bird_active,
            "is_open_for_registration": event.is_open_for_registration,
            "categories": [
                {
                    "id": c.id,
                    "name": c.name,
                    "price_regular": str(c.price_regular),
                    "price_early_bird": str(c.price_early_bird),
                    "current_price": str(c.current_price()),
                }
                for c in event.categories.all()
            ],
        })
    return JsonResponse({"ok": True, "events": payload})


@require_http_methods(["POST"])
def api_register_event(request, slug):
    event = get_object_or_404(Event, slug=slug)
    if not event.is_open_for_registration:
        return JsonResponse({"ok": False, "error": "Registration is closed for this event."}, status=400)

    data = _json_body(request)
    category_name = (data.get("category") or "").strip()
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("phone") or "").strip()
    address = (data.get("address") or "").strip()

    errors = {}
    if len(name) < 2:
        errors["name"] = "Please enter your full name."
    if not email or not EMAIL_RE.match(email):
        errors["email"] = "Please enter a valid email address."
    digits = re.sub(r"\D", "", phone)
    if not re.match(r"^\d{10}$", digits):
        errors["phone"] = "Please enter a valid 10-digit mobile number."
    if len(address) < 5:
        errors["address"] = "Please enter your full address."

    category = event.categories.filter(name=category_name).first()
    if not category:
        errors["category"] = "Please choose a valid race category."

    if errors:
        return JsonResponse({"ok": False, "errors": errors}, status=400)

    amount = category.current_price()
    registration = Registration.objects.create(
        user=request.user if request.user.is_authenticated else None,
        event=event,
        category=category,
        name=name,
        email=email,
        phone=digits,
        address=address,
        amount=amount,
        status=Registration.STATUS_PENDING,  # payment happens next, via Razorpay checkout
    )

    return JsonResponse({
        "ok": True,
        "registration": {
            "id": registration.id,
            "event": event.name,
            "category": category.name,
            "amount": str(amount),
            "status": registration.status,
            "bib_number": registration.bib_number,
        },
    })


@require_http_methods(["POST"])
def api_contact(request):
    data = _json_body(request)
    name = (data.get("name") or "").strip()
    phone = (data.get("phone") or "").strip()
    email = (data.get("email") or "").strip().lower()
    message = (data.get("message") or "").strip()

    errors = {}
    if not name:
        errors["name"] = "Please enter your name."
    digits = re.sub(r"\D", "", phone)[-10:]
    if not digits or not PHONE_RE.match(digits):
        errors["phone"] = "Please enter a valid 10-digit mobile number."
    if not email or not EMAIL_RE.match(email):
        errors["email"] = "Please enter a valid email address."
    if not message or len(message) < 5:
        errors["message"] = "Please enter your message."

    if errors:
        return JsonResponse({"ok": False, "errors": errors}, status=400)

    ContactMessage.objects.create(name=name, phone=digits, email=email, message=message)
    return JsonResponse({"ok": True})


# ==========================================================================
# Become a Sponsor
# ==========================================================================

def sponsor_view(request):
    """
    Renders the 'Become a Sponsor' page and handles the sponsorship
    inquiry form. On a valid POST: saves the inquiry (with any uploaded
    logo/brochure/proposal files), shows a success message, and redirects
    to the 'Thank You for Sponsoring' page. On an invalid POST, re-renders
    the page with field-level errors and the previously entered values.
    """
    if request.method == "POST":
        form = SponsorInquiryForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            messages.success(
                request,
                "Thank you! Your sponsorship request has been received. "
                "Our team will reach out to you shortly.",
            )
            return redirect("sponsor_thank_you")
        messages.error(request, "Please correct the errors below and resubmit the form.")
    else:
        form = SponsorInquiryForm()

    return render(request, "sponsor.html", {
        "form": form,
        "selected_events": request.POST.getlist("events_interested") if request.method == "POST" else [],
    })


def sponsor_thank_you_view(request):
    return render(request, "sponsor-thank-you.html")



# ---------------------------------------------------------------------------
# Demo payment flow
# ---------------------------------------------------------------------------
# The real Razorpay gateway integration has been removed for this demo build.
# No external payment gateway is called and no real money moves — a fake
# "order" reference is generated locally and the front-end's payment.js
# simulates a short processing delay before reporting success. This keeps
# the exact same registration -> "pay" -> ticket flow the site had before,
# so it's safe to demo end-to-end without live payment gateway credentials.


@csrf_exempt
@require_http_methods(["POST"])
def create_payment(request):
    """Create a local demo "order" for a pending registration and hand the
    front-end (payment.js) what it needs to show the payment sheet and
    simulate a successful payment."""

    try:
        data = json.loads(request.body)
        registration_id = data.get("registration_id")
        registration = Registration.objects.get(id=registration_id)
    except (json.JSONDecodeError, KeyError, TypeError):
        return JsonResponse({"ok": False, "error": "Invalid request."}, status=400)
    except Registration.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Registration not found."}, status=404)

    if registration.status == Registration.STATUS_PAID:
        return JsonResponse({"ok": False, "error": "This registration is already paid for."}, status=400)

    amount = int(registration.amount * 100)  # keep amount in paise, same as before

    # No gateway call — just a locally generated demo order reference.
    order_id = "demo_order_" + uuid.uuid4().hex[:16]

    registration.razorpay_order_id = order_id
    registration.save(update_fields=["razorpay_order_id"])

    return JsonResponse({
        "demo": True,
        "order_id": order_id,
        "amount": amount,
        "registration_id": registration.id,
        "name": registration.name,
        "email": registration.email,
        "phone": registration.phone,
    })


@csrf_exempt
@require_http_methods(["POST"])
def payment_success(request):
    """Mark a registration paid for the simulated demo payment, generate
    its QR code and email it out. There is no real gateway signature to
    verify — the front-end only calls this after its simulated "processing"
    step completes."""

    try:
        data = json.loads(request.body)
        order_id = data["razorpay_order_id"]
    except (json.JSONDecodeError, KeyError, TypeError):
        return JsonResponse({"ok": False, "error": "Invalid payment payload."}, status=400)

    payment_id = data.get("razorpay_payment_id") or ("demo_pay_" + uuid.uuid4().hex[:16])

    try:
        registration = Registration.objects.get(razorpay_order_id=order_id)
    except Registration.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Registration not found for this order."}, status=404)

    # Idempotent: if this handler ever fires twice for the same order, don't
    # regenerate the QR code / resend the email — just confirm success.
    if registration.status != Registration.STATUS_PAID:
        registration.razorpay_payment_id = payment_id
        registration.status = Registration.STATUS_PAID
        registration.payment_date = timezone.now()
        registration.save()  # generates bib_number now that status is PAID

        try:
            generate_qr(registration)
            send_email(registration)
        except Exception:
            # Payment already succeeded and is recorded — don't fail the
            # response over a mail/QR hiccup, just log it for follow-up.
            logging.exception(
                "Payment for registration %s succeeded, but QR/email failed.",
                registration.id,
            )

    return JsonResponse({
        "ok": True,
        "status": "success",
        "registration": {
            "id": registration.id,
            "name": registration.name,
            "email": registration.email,
            "bib_number": registration.bib_number,
            "event": registration.event.name,
            "event_location": registration.event.location,
            "event_date": registration.event.event_date.isoformat() if registration.event.event_date else None,
            "category": registration.category.name,
            "amount": str(registration.amount),
            "qr_code": registration.qr_code.url if registration.qr_code else None,
        },
    })

def generate_qr(registration):

    qr=qrcode.make(

        f"""

Name:{registration.name}

Event:{registration.event.name}

Bib:{registration.bib_number}

Email:{registration.email}

"""

    )

    buffer=BytesIO()

    qr.save(buffer)

    registration.qr_code.save(

        f"{registration.bib_number}.png",

        File(buffer),

        save=True

    )

def send_email(registration):

    email=EmailMessage(

        "AADHI Registration Successful",

        f"""

Hello {registration.name},

Your registration is confirmed.

Event:

{registration.event.name}

Date:

{registration.event.event_date}

Bib Number:

{registration.bib_number}

Please bring the attached QR code.

Thank You.

AADHI Events😊

""",

        settings.DEFAULT_FROM_EMAIL,

        [registration.email]

    )

    email.attach_file(registration.qr_code.path)

    email.send()