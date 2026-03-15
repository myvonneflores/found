import csv
from pathlib import Path
from urllib.parse import urlparse

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from companies.cities import canonicalize_city
from companies.models import (
    BusinessCategory,
    Company,
    CuisineType,
    OwnershipMarker,
    ProductCategory,
    SustainabilityMarker,
)

BUSINESS_CATEGORY_PRIORITY = [
    "Food",
    "Health/Wellness & Beauty",
    "Retail",
]

PRODUCT_CATEGORY_ALIASES = {
    "Kid's": "Kids",
    "Music / Records": "Music/Records",
    "Make Up/Skin Care": "Makeup/Skincare",
    "Bags/Backpacks": "Bags & Backpacks",
    "Bags & Backpacks": "Accessories",
    "Beauty": "Makeup/Skincare",
    "Rugs": "Home Goods",
    "Toys": "Gifts",
}

EXCLUDED_PRODUCT_CATEGORIES = {
    "Women's",
    "Men's",
    "Unisex",
    "Kids",
    "Plus Size",
    "Consignment",
    "Groceries",
}

EXCLUDED_COMPANY_NAMES = {
    "Alien Mermaid Cove",
    "Revive Athletics",
    "Soren",
    "Soulful PDX",
}

US_STATE_CODES = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    "DC",
}


def clean_value(value):
    if value is None:
        return ""
    return value.strip()


def split_multi_value(value):
    cleaned = clean_value(value)
    if not cleaned:
        return []
    return [item.strip() for item in cleaned.split(";") if item.strip()]


def normalize_business_category(value):
    candidates = split_multi_value(value)
    if not candidates:
        return ""

    unique_candidates = {candidate for candidate in candidates}
    for category in BUSINESS_CATEGORY_PRIORITY:
        if category in unique_candidates:
            return category

    return candidates[0]


def normalize_product_categories(value):
    normalized = []
    seen = set()
    for item in split_multi_value(value):
        cleaned = item
        while cleaned in PRODUCT_CATEGORY_ALIASES:
            cleaned = PRODUCT_CATEGORY_ALIASES[cleaned]
        if cleaned in EXCLUDED_PRODUCT_CATEGORIES:
            continue
        if cleaned not in seen:
            normalized.append(cleaned)
            seen.add(cleaned)
    return normalized


def normalize_cuisine_types(value):
    normalized = []
    seen = set()
    for item in split_multi_value(value):
        cleaned = item.strip()
        if cleaned and cleaned not in seen:
            normalized.append(cleaned)
            seen.add(cleaned)
    return normalized


def normalize_city(value):
    return canonicalize_city(clean_value(value))


def normalize_state(value, city):
    state = clean_value(value).upper()
    city_value = clean_value(city).lower()
    if not state and city_value == "portland":
        return "OR"
    return state


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


def normalize_country(value, state):
    country = clean_value(value)
    state_value = clean_value(state).upper()

    if country in {"", "USA", "US", "United States of America"} and state_value in US_STATE_CODES:
        return "United States"

    return country


class Command(BaseCommand):
    help = "Import or update companies from a CSV export into the audited company schema."

    def add_arguments(self, parser):
        parser.add_argument("csv_path", help="Path to the CSV file to import.")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate and summarize the import without writing any data.",
        )
        parser.add_argument(
            "--include-private-metrics",
            action="store_true",
            help="Import annual revenue and employee counts in addition to public-facing fields.",
        )
        parser.add_argument(
            "--prune-unused-taxonomies",
            action="store_true",
            help="Delete taxonomy records that are no longer attached to any imported companies.",
        )

    def handle(self, *args, **options):
        csv_path = Path(options["csv_path"]).expanduser()
        dry_run = options["dry_run"]
        include_private_metrics = options["include_private_metrics"]
        prune_unused_taxonomies = options["prune_unused_taxonomies"]

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
        operation(csv_path, summary, include_private_metrics)

        if prune_unused_taxonomies and not dry_run:
            self.prune_unused_taxonomies()

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

    def prune_unused_taxonomies(self):
        BusinessCategory.objects.filter(companies__isnull=True).delete()
        ProductCategory.objects.filter(companies__isnull=True).delete()
        CuisineType.objects.filter(companies__isnull=True).delete()
        OwnershipMarker.objects.filter(companies__isnull=True).delete()
        SustainabilityMarker.objects.filter(companies__isnull=True).delete()

    def iterate_rows(self, csv_path):
        with csv_path.open(newline="", encoding="utf-8-sig") as csv_file:
            reader = csv.DictReader(csv_file)
            for row in reader:
                yield row

    @transaction.atomic
    def run_import(self, csv_path, summary, include_private_metrics):
        for row in self.iterate_rows(csv_path):
            self.process_row(row, summary, persist=True, include_private_metrics=include_private_metrics)

    def run_dry_import(self, csv_path, summary, include_private_metrics):
        for row in self.iterate_rows(csv_path):
            self.process_row(row, summary, persist=False, include_private_metrics=include_private_metrics)

    def process_row(self, row, summary, persist, include_private_metrics):
        summary["processed"] += 1

        name = clean_value(row.get("name"))
        if not name:
            summary["skipped"] += 1
            return
        if name in EXCLUDED_COMPANY_NAMES:
            if persist:
                Company.objects.filter(name=name).delete()
            summary["skipped"] += 1
            return

        city = normalize_city(row.get("city"))
        state = normalize_state(row.get("state"), city)
        payload = {
            "description": clean_value(row.get("description") or row.get("about_us")),
            "website": normalize_url(row.get("website") or row.get("domain")),
            "founded_year": parse_int(row.get("founded_year")),
            "address": clean_value(row.get("address")),
            "city": city,
            "state": state,
            "zip_code": clean_value(row.get("zip") or row.get("postal_code_2")),
            "country": normalize_country(row.get("country"), state),
            "instagram_handle": normalize_instagram_handle(row.get("instagram_handle")),
            "facebook_page": normalize_url(row.get("facebook_company_page")),
            "linkedin_page": normalize_url(row.get("linkedin_company_page")),
            "annual_revenue": None,
            "number_of_employees": None,
            "is_vegan_friendly": "Vegan Friendly" in split_multi_value(row.get("vegan_gf_friendly_")),
            "is_gf_friendly": "Gluten Free Friendly" in split_multi_value(row.get("vegan_gf_friendly_")),
        }

        if include_private_metrics:
            payload["annual_revenue"] = parse_int(row.get("annualrevenue") or row.get("total_revenue"))
            payload["number_of_employees"] = parse_int(row.get("numberofemployees"))

        business_category_name = normalize_business_category(row.get("business_category"))
        product_categories = normalize_product_categories(row.get("product_categories"))
        cuisine_types = normalize_cuisine_types(row.get("food_type"))
        ownership_markers = split_multi_value(row.get("owner_demographics"))
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
            company.cuisine_types.set(
                [
                    CuisineType.objects.get_or_create(name=category_name)[0]
                    for category_name in cuisine_types
                ]
            )
            company.ownership_markers.set(
                [
                    OwnershipMarker.objects.get_or_create(name=marker_name)[0]
                    for marker_name in ownership_markers
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
