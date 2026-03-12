import csv
from pathlib import Path
from urllib.parse import urlparse

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from companies.models import (
    BusinessCategory,
    Company,
    ProductCategory,
    SustainabilityMarker,
)


def clean_value(value):
    if value is None:
        return ""
    return value.strip()


def split_multi_value(value):
    cleaned = clean_value(value)
    if not cleaned:
        return []
    return [item.strip() for item in cleaned.split(";") if item.strip()]


def parse_int(value):
    cleaned = clean_value(value).replace(",", "")
    if not cleaned:
        return None
    try:
        return int(cleaned)
    except ValueError:
        return None


def normalize_url(value):
    cleaned = clean_value(value)
    if not cleaned:
        return ""

    cleaned = cleaned.replace("https;//", "https://").replace("http;//", "http://")
    if cleaned.startswith("www."):
        cleaned = f"https://{cleaned}"
    elif "://" not in cleaned:
        cleaned = f"https://{cleaned}"

    parsed = urlparse(cleaned)
    if not parsed.netloc:
        return ""
    return cleaned


def normalize_instagram_handle(value):
    cleaned = clean_value(value)
    if not cleaned:
        return ""

    cleaned = cleaned.rstrip("/")
    if "instagram.com/" in cleaned:
        cleaned = cleaned.split("instagram.com/", 1)[1]
    cleaned = cleaned.lstrip("@/")
    return cleaned


class Command(BaseCommand):
    help = "Import or update companies from a CSV export into the audited company schema."

    def add_arguments(self, parser):
        parser.add_argument("csv_path", help="Path to the CSV file to import.")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate and summarize the import without writing any data.",
        )

    def handle(self, *args, **options):
        csv_path = Path(options["csv_path"]).expanduser()
        dry_run = options["dry_run"]

        if not csv_path.exists():
            raise CommandError(f"CSV file does not exist: {csv_path}")

        summary = {
            "processed": 0,
            "created": 0,
            "updated": 0,
            "skipped": 0,
            "errors": 0,
        }

        operation = self.run_import if not dry_run else self.run_dry_import
        operation(csv_path, summary)

        self.stdout.write(
            self.style.SUCCESS(
                "Import complete: "
                f"{summary['processed']} processed, "
                f"{summary['created']} created, "
                f"{summary['updated']} updated, "
                f"{summary['skipped']} skipped, "
                f"{summary['errors']} errors"
            )
        )

    def iterate_rows(self, csv_path):
        with csv_path.open(newline="", encoding="utf-8-sig") as csv_file:
            reader = csv.DictReader(csv_file)
            for row in reader:
                yield row

    @transaction.atomic
    def run_import(self, csv_path, summary):
        for row in self.iterate_rows(csv_path):
            self.process_row(row, summary, persist=True)

    def run_dry_import(self, csv_path, summary):
        for row in self.iterate_rows(csv_path):
            self.process_row(row, summary, persist=False)

    def process_row(self, row, summary, persist):
        summary["processed"] += 1

        name = clean_value(row.get("name"))
        if not name:
            summary["skipped"] += 1
            return

        payload = {
            "description": clean_value(row.get("description") or row.get("about_us")),
            "website": normalize_url(row.get("website") or row.get("domain")),
            "founded_year": parse_int(row.get("founded_year")),
            "address": clean_value(row.get("address")),
            "city": clean_value(row.get("city")),
            "state": clean_value(row.get("state")),
            "zip_code": clean_value(row.get("zip") or row.get("postal_code_2")),
            "country": clean_value(row.get("country")),
            "instagram_handle": normalize_instagram_handle(row.get("instagram_handle")),
            "facebook_page": normalize_url(row.get("facebook_company_page")),
            "linkedin_page": normalize_url(row.get("linkedin_company_page")),
            "annual_revenue": parse_int(row.get("annualrevenue") or row.get("total_revenue")),
            "number_of_employees": parse_int(row.get("numberofemployees")),
            "is_vegan_friendly": "Vegan Friendly" in split_multi_value(row.get("vegan_gf_friendly_")),
            "is_gf_friendly": "Gluten Free Friendly" in split_multi_value(row.get("vegan_gf_friendly_")),
        }

        business_category_name = clean_value(row.get("business_category"))
        product_categories = split_multi_value(row.get("product_categories"))
        sustainability_markers = split_multi_value(row.get("sustainability_markers"))

        if not persist:
            existing = Company.objects.filter(name=name).exists()
            summary["updated" if existing else "created"] += 1
            return

        try:
            business_category = None
            if business_category_name:
                business_category, _ = BusinessCategory.objects.get_or_create(
                    name=business_category_name
                )
            payload["business_category"] = business_category

            company, created = Company.objects.update_or_create(
                name=name,
                defaults=payload,
            )

            company.product_categories.set(
                [
                    ProductCategory.objects.get_or_create(name=category_name)[0]
                    for category_name in product_categories
                ]
            )
            company.sustainability_markers.set(
                [
                    SustainabilityMarker.objects.get_or_create(name=marker_name)[0]
                    for marker_name in sustainability_markers
                ]
            )

            summary["created" if created else "updated"] += 1
        except Exception as exc:
            summary["errors"] += 1
            self.stderr.write(f"Error importing {name}: {exc}")

