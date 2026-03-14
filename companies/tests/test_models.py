import pytest

from companies.models import Company


@pytest.mark.django_db
class TestCompanySlugGeneration:
    def test_generates_unique_slug(self):
        first = Company.objects.create(name="Found Shop")
        second = Company.objects.create(name="Found Shop")

        assert first.slug == "found-shop"
        assert second.slug == "found-shop-2"
