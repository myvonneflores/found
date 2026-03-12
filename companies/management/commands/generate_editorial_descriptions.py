from django.core.management.base import BaseCommand
from django.db import transaction

from companies.models import Company


def join_parts(parts):
    return ", ".join([part for part in parts if part])


def category_phrase(company):
    if company.business_category:
        if company.business_category.name == "Food":
            return "independent food business"
        if company.business_category.name == "Health/Wellness & Beauty":
            return "independent wellness and beauty business"
        if company.business_category.name == "Retail":
            return "independent retail business"
    return "independent business"


def location_phrase(company):
    location = join_parts([company.city, company.state, company.country])
    if location:
        return f"based in {location}"
    return ""


def founded_phrase(company):
    if company.founded_year:
        return f"Founded in {company.founded_year},"
    return ""


def taxonomy_phrase(company):
    categories = list(company.product_categories.values_list("name", flat=True)[:3])
    if categories:
        return f"It features {', '.join(categories)}."
    return ""


def values_phrase(company):
    traits = []
    if company.is_vegan_friendly:
        traits.append("vegan-friendly offerings")
    if company.is_gf_friendly:
        traits.append("gluten-free-friendly offerings")
    markers = list(company.sustainability_markers.values_list("name", flat=True)[:2])
    if markers:
        traits.append(", ".join(markers).lower())
    if traits:
        return f"It is known for {' and '.join(traits)}."
    return ""


def generate_description(company):
    intro_parts = [f"{company.name} is an {category_phrase(company)}"]
    location = location_phrase(company)
    if location:
        intro_parts.append(location)
    intro = " ".join(intro_parts).strip()
    intro = f"{intro}."

    founded = founded_phrase(company)
    taxonomy = taxonomy_phrase(company)
    values = values_phrase(company)

    body = " ".join(part for part in [founded, taxonomy, values] if part).strip()
    if body:
        return f"{intro} {body}".strip()
    return intro


class Command(BaseCommand):
    help = "Generate first-pass editorial descriptions for companies with blank descriptions."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Maximum number of companies to update.",
        )
        parser.add_argument(
            "--overwrite",
            action="store_true",
            help="Regenerate descriptions even for companies that already have one.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        queryset = Company.objects.select_related("business_category").prefetch_related(
            "product_categories",
            "sustainability_markers",
        )
        if not options["overwrite"]:
            queryset = queryset.filter(description="")

        if options["limit"] is not None:
            queryset = queryset[: options["limit"]]

        updated = 0
        for company in queryset:
            company.description = generate_description(company)
            company.needs_editorial_review = True
            company.save(update_fields=["description", "needs_editorial_review", "updated_at"])
            updated += 1

        self.stdout.write(self.style.SUCCESS(f"Generated editorial descriptions for {updated} companies"))
