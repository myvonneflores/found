import factory
from django.contrib.auth import get_user_model

from companies.models import (
    BusinessCategory,
    Company,
    OwnershipMarker,
    ProductCategory,
    SustainabilityMarker,
)

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        skip_postgeneration_save = True

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        pwd = extracted or "testpass123"
        self.set_password(pwd)
        if create:
            self.save(update_fields=["password"])


class BusinessCategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = BusinessCategory

    name = factory.Sequence(lambda n: f"Business Category {n}")


class ProductCategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ProductCategory

    name = factory.Sequence(lambda n: f"Product Category {n}")


class OwnershipMarkerFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = OwnershipMarker

    name = factory.Sequence(lambda n: f"Ownership Marker {n}")


class SustainabilityMarkerFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = SustainabilityMarker

    name = factory.Sequence(lambda n: f"Sustainability Marker {n}")


class CompanyFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Company
        skip_postgeneration_save = True

    name = factory.Sequence(lambda n: f"Company {n}")
    description = factory.Faker("sentence")
    city = "Portland"
    state = "Oregon"
    country = "USA"
    business_category = factory.SubFactory(BusinessCategoryFactory)

    @factory.post_generation
    def product_categories(self, create, extracted, **kwargs):
        if not create or not extracted:
            return
        self.product_categories.add(*extracted)

    @factory.post_generation
    def ownership_markers(self, create, extracted, **kwargs):
        if not create or not extracted:
            return
        self.ownership_markers.add(*extracted)

    @factory.post_generation
    def sustainability_markers(self, create, extracted, **kwargs):
        if not create or not extracted:
            return
        self.sustainability_markers.add(*extracted)
