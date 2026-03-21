import pytest

from companies.models import Company


@pytest.mark.django_db
class TestCompanySlugGeneration:
    def test_generates_unique_slug(self):
        first = Company.objects.create(name="Found Shop")
        second = Company.objects.create(name="Found Shop")

        assert first.slug == "found-shop"
        assert second.slug == "found-shop-2"

    def test_generates_location_aware_slug_for_same_name_businesses(self):
        chicago = Company.objects.create(name="Matt's", city="Chicago", state="IL")
        miami = Company.objects.create(name="Matt's", city="Miami", state="FL")

        assert chicago.slug == "matts-chicago"
        assert miami.slug == "matts-miami"
