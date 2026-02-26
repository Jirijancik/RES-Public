"""
Django management command for syncing Justice open data.

Usage:
    # Sync all "actual" datasets for the current year
    python manage.py justice_sync --type actual --year 2026

    # Sync only SROs from Prague
    python manage.py justice_sync --legal-form sro --location praha

    # Force re-sync a specific dataset
    python manage.py justice_sync --dataset sro-actual-praha-2026 --force

    # Dry run — list matching datasets without syncing
    python manage.py justice_sync --type actual --year 2026 --dry-run
"""
from django.core.management.base import BaseCommand

from justice.services import JusticeSyncService


class Command(BaseCommand):
    help = "Sync data from the Czech Justice Open Data portal (dataor.justice.cz)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dataset", type=str, help="Sync a specific dataset ID"
        )
        parser.add_argument(
            "--type",
            type=str,
            choices=["actual", "full"],
            default="actual",
            help="Dataset type to sync (default: actual)",
        )
        parser.add_argument(
            "--legal-form", type=str, help="Filter by legal form code (e.g. sro, as)"
        )
        parser.add_argument(
            "--location", type=str, help="Filter by court location (e.g. praha, brno)"
        )
        parser.add_argument("--year", type=int, help="Filter by year")
        parser.add_argument(
            "--force",
            action="store_true",
            help="Re-sync even if file size is unchanged",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="List matching datasets without syncing",
        )

    def handle(self, *args, **options):
        sync_service = JusticeSyncService()

        if options["dataset"]:
            self._sync_single(sync_service, options)
        elif options["dry_run"]:
            self._dry_run(sync_service, options)
        else:
            self._sync_multiple(sync_service, options)

    def _sync_single(self, sync_service, options):
        """Sync a single dataset by ID."""
        dataset_id = options["dataset"]
        self.stdout.write(f"Syncing dataset: {dataset_id}")

        result = sync_service.sync_dataset(dataset_id, force=options["force"])

        if result["status"] == "completed":
            self.stdout.write(
                self.style.SUCCESS(
                    f"  ✓ {result['datasetId']}: "
                    f"{result['entityCount']} entities "
                    f"in {result['durationSeconds']}s"
                )
            )
        elif result["status"] == "skipped":
            self.stdout.write(f"  – {result['datasetId']}: skipped (unchanged)")
        else:
            self.stdout.write(
                self.style.ERROR(f"  ✗ {result['datasetId']}: {result['status']}")
            )

    def _sync_multiple(self, sync_service, options):
        """Sync multiple datasets matching the filters."""
        legal_forms = [options["legal_form"]] if options["legal_form"] else None
        locations = [options["location"]] if options["location"] else None
        year = options["year"]

        self.stdout.write(
            f"Syncing {options['type']} datasets"
            f"{f' for {legal_forms}' if legal_forms else ''}"
            f"{f' in {locations}' if locations else ''}"
            f"{f' year {year}' if year else ''}"
        )

        results = sync_service.sync_all_actual(
            legal_forms=legal_forms,
            locations=locations,
            year=year,
            force=options["force"],
        )

        completed = sum(1 for r in results if r["status"] == "completed")
        skipped = sum(1 for r in results if r["status"] == "skipped")
        failed = sum(1 for r in results if r["status"] == "failed")
        total_entities = sum(r.get("entityCount", 0) for r in results)

        for result in results:
            if result["status"] == "completed":
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  ✓ {result['datasetId']}: "
                        f"{result['entityCount']} entities"
                    )
                )
            elif result["status"] == "skipped":
                self.stdout.write(f"  – {result['datasetId']}: skipped")
            else:
                self.stdout.write(
                    self.style.ERROR(
                        f"  ✗ {result['datasetId']}: "
                        f"{result.get('error', result['status'])}"
                    )
                )

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Done: {completed} completed, {skipped} skipped, {failed} failed. "
                f"{total_entities} total entities."
            )
        )

    def _dry_run(self, sync_service, options):
        """List matching datasets without syncing."""
        all_ids = sync_service.client.list_datasets()

        matching = []
        for ds_id in all_ids:
            parsed = sync_service._parse_dataset_id(ds_id)
            if parsed["dataset_type"] != options["type"]:
                continue
            if options["legal_form"] and parsed["legal_form"] != options["legal_form"]:
                continue
            if options["location"] and parsed["location"] != options["location"]:
                continue
            if options["year"] and parsed["year"] != options["year"]:
                continue
            matching.append(ds_id)

        self.stdout.write(f"Found {len(matching)} matching datasets:")
        for ds_id in matching[:50]:
            self.stdout.write(f"  {ds_id}")
        if len(matching) > 50:
            self.stdout.write(f"  ... and {len(matching) - 50} more")
