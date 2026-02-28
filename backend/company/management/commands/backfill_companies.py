"""
Backfill Company hub records from existing Justice entities.

Usage:
    python manage.py backfill_companies
    python manage.py backfill_companies --dry-run
"""
import logging
from django.core.management.base import BaseCommand
from django.db import transaction

from company.models import Company
from justice.models import Entity

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Create Company records for each unique ICO in Justice entities and link them."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without making changes.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        # Find all unique ICOs in Justice entities.
        unique_icos = (
            Entity.objects.values_list("ico", flat=True)
            .distinct()
            .order_by("ico")
        )

        created_count = 0
        linked_count = 0

        for ico in unique_icos:
            if dry_run:
                exists = Company.objects.filter(ico=ico).exists()
                if not exists:
                    self.stdout.write(f"  Would create Company for ICO {ico}")
                    created_count += 1
                continue

            # Get name from most recently updated entity for this ICO.
            entity = Entity.objects.filter(ico=ico).order_by("-updated_at").first()
            if not entity:
                continue

            with transaction.atomic():
                company, was_created = Company.objects.get_or_create(
                    ico=ico,
                    defaults={
                        "name": entity.name,
                        "is_active": entity.is_active,
                    },
                )
                if was_created:
                    created_count += 1

                # Link all entities with this ICO to the company.
                updated = Entity.objects.filter(ico=ico, company__isnull=True).update(
                    company=company
                )
                linked_count += updated

        if dry_run:
            self.stdout.write(f"\nDry run: would create {created_count} companies.")
        else:
            self.stdout.write(
                f"Done: created {created_count} companies, linked {linked_count} entities."
            )
