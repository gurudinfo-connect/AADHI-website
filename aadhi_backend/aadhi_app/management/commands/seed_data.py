from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from aadhi_app.models import Event, EventCategory


class Command(BaseCommand):
    help = "Seed the database with the Bengaluru Corporate Wellness Run event and categories."

    def handle(self, *args, **options):
        event, created = Event.objects.update_or_create(
            slug="bengaluru-corporate-wellness-run",
            defaults=dict(
                name="Bengaluru Corporate Wellness Run 2026",
                location="NICE Road, Bengaluru",
                event_date=parse_datetime("2026-11-15T06:30:00+05:30"),
                early_bird_deadline=parse_datetime("2026-10-15T23:59:59+05:30"),
                is_open_for_registration=True,
            ),
        )
        self.stdout.write(self.style.SUCCESS(f"{'Created' if created else 'Updated'} event: {event.name}"))

        categories = [
            ("3 KM Fun Run", "1000.00", "800.00"),
            ("5 KM Timed Run", "1200.00", "1000.00"),
            ("10 KM Timed Run", "1500.00", "1200.00"),
        ]
        for name, regular, early in categories:
            cat, cat_created = EventCategory.objects.update_or_create(
                event=event,
                name=name,
                defaults=dict(price_regular=regular, price_early_bird=early),
            )
            self.stdout.write(
                self.style.SUCCESS(f"  {'Created' if cat_created else 'Updated'} category: {cat.name}")
            )

        self.stdout.write(self.style.SUCCESS("Seed complete."))
