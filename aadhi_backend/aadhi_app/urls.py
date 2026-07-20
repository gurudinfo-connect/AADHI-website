from django.urls import path
from . import views

urlpatterns = [
    # Pages (kept at the same filenames as the original static site)
    path("", views.index_view, name="index"),
    path("index.html", views.index_view, name="index_html"),
    path("signin.html", views.signin_view, name="signin"),
    path("signup.html", views.signup_view, name="signup"),
    path("amaravati.html", views.amaravati_view, name="amaravati"),
    path("telangana.html", views.telangana_view, name="telangana"),
    path(
        "bengaluru-corporate-wellness-run.html",
        views.bengaluru_event_view,
        name="bengaluru_event",
    ),
    path("sponsor.html", views.sponsor_view, name="sponsor"),
    path("sponsor-thank-you.html", views.sponsor_thank_you_view, name="sponsor_thank_you"),
    path("create-payment/", views.create_payment, name="create_payment"),
    path("payment-success/", views.payment_success, name="payment_success"),

    # JSON API
    path("api/auth/signup/", views.api_signup, name="api_signup"),
    path("api/auth/login/", views.api_login, name="api_login"),
    path("api/auth/logout/", views.api_logout, name="api_logout"),
    path("api/auth/me/", views.api_me, name="api_me"),
    path("api/events/", views.api_events, name="api_events"),
    path("api/events/<slug:slug>/register/", views.api_register_event, name="api_register_event"),
    path("api/contact/", views.api_contact, name="api_contact"),
]
