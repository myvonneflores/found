from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from companies.models import BusinessCategory, Company


class Command(BaseCommand):
    help = "Merge one business category into another and reassign all company relationships."

    def add_arguments(self, parser):
        parser.add_argument("source_name", help="Business category name to merge from.")
        parser.add_argument("target_name", help="Business category name to merge into.")

    @transaction.atomic
    def handle(self, *args, **options):
        source_name = options["source_name"].strip()
        target_name = options["target_name"].strip()

        if not source_name or not target_name:
            raise CommandError("Both source_name and target_name are required.")

        if source_name == target_name:
            self.stdout.write(self.style.SUCCESS(f"Nothing to do. '{source_name}' is already the target name."))
            return

        try:
            source = BusinessCategory.objects.get(name=source_name)
        except BusinessCategory.DoesNotExist as exc:
            raise CommandError(f"Source category '{source_name}' was not found.") from exc

        target, created = BusinessCategory.objects.get_or_create(name=target_name)

        if source.pk == target.pk:
            self.stdout.write(self.style.SUCCESS(f"Nothing to do. '{target_name}' is already in place."))
            return

        now = timezone.now()
        updated_fk_count = Company.objects.filter(business_category=source).update(
            business_category=target,
            updated_at=now,
        )

        updated_m2m_count = 0
        companies = Company.objects.filter(business_categories=source).distinct()
        for company in companies:
            company.business_categories.add(target)
            company.business_categories.remove(source)
            updated_m2m_count += 1

        source.delete()

        creation_message = "Created target category." if created else "Used existing target category."
        self.stdout.write(
            self.style.SUCCESS(
                f"Merged '{source_name}' into '{target_name}'. "
                f"{creation_message} "
                f"Updated {updated_fk_count} primary category assignments and "
                f"{updated_m2m_count} multi-select category assignments."
            )
        )
