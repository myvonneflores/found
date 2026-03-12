from django.core.management.base import BaseCommand
from django.db.models import Count, Q

from companies.models import Company, ProductCategory


class Command(BaseCommand):
    help = "Report data quality issues and low-frequency taxonomy values for the company directory."

    def add_arguments(self, parser):
        parser.add_argument(
            "--low-frequency-threshold",
            type=int,
            default=2,
            help="Report product categories used by this many companies or fewer.",
        )

    def handle(self, *args, **options):
        threshold = options["low_frequency_threshold"]

        self.stdout.write("Company Data Audit")
        self.stdout.write(f"Total companies: {Company.objects.count()}")
        self.stdout.write("")

        self.write_missing_core_fields()
        self.write_missing_location_rows()
        self.write_low_frequency_product_categories(threshold)

    def write_missing_core_fields(self):
        missing_description = Company.objects.filter(description="").order_by("name")
        missing_website = Company.objects.filter(website="").order_by("name")

        self.stdout.write(f"Missing descriptions: {missing_description.count()}")
        for company in missing_description[:15]:
            self.stdout.write(f"- {company.name}")
        self.stdout.write("")

        self.stdout.write(f"Missing websites: {missing_website.count()}")
        for company in missing_website[:15]:
            self.stdout.write(f"- {company.name}")
        self.stdout.write("")

    def write_missing_location_rows(self):
        missing_location = Company.objects.filter(
            Q(city="") | Q(state="") | Q(country="")
        ).order_by("name")

        self.stdout.write(f"Missing any location field: {missing_location.count()}")
        for company in missing_location:
            city = company.city or "?"
            state = company.state or "?"
            country = company.country or "?"
            self.stdout.write(f"- {company.name} | city={city} | state={state} | country={country}")
        self.stdout.write("")

    def write_low_frequency_product_categories(self, threshold):
        categories = (
            ProductCategory.objects.annotate(company_count=Count("companies"))
            .filter(company_count__lte=threshold)
            .order_by("company_count", "name")
        )

        self.stdout.write(
            f"Product categories used by {threshold} companies or fewer: {categories.count()}"
        )
        for category in categories:
            self.stdout.write(f"- {category.name} ({category.company_count})")
