import pytest

from tests.factories import (
    BusinessCategoryFactory,
    CompanyFactory,
    OwnershipMarkerFactory,
    ProductCategoryFactory,
    SustainabilityMarkerFactory,
)


@pytest.fixture
def taxonomy_set(db):
    """Taxonomy objects shared across company API tests."""
    return {
        "retail": BusinessCategoryFactory(name="Retail"),
        "food": BusinessCategoryFactory(name="Food+Bev"),
        "clothing": ProductCategoryFactory(name="Clothing"),
        "gifts": ProductCategoryFactory(name="Gifts"),
        "woman_owned": OwnershipMarkerFactory(name="Woman Owned"),
        "bipoc_owned": OwnershipMarkerFactory(name="BIPOC Owned"),
        "sustainable": SustainabilityMarkerFactory(name="Sustainable Products"),
        "vintage": SustainabilityMarkerFactory(name="Vintage Goods"),
    }


@pytest.fixture
def two_companies(taxonomy_set):
    """Two-company dataset matching the original setUpTestData."""
    company_one = CompanyFactory(
        name="North Star Market",
        description="Neighborhood grocery with eco products.",
        city="Portland",
        state="Oregon",
        country="USA",
        founded_year=2018,
        business_category=taxonomy_set["food"],
        is_vegan_friendly=True,
        number_of_employees=12,
        product_categories=[taxonomy_set["gifts"]],
        ownership_markers=[taxonomy_set["woman_owned"]],
        sustainability_markers=[taxonomy_set["sustainable"]],
    )
    company_two = CompanyFactory(
        name="Cedar Cloth",
        description="Independent apparel studio.",
        city="Seattle",
        state="Washington",
        country="USA",
        founded_year=2014,
        business_category=taxonomy_set["retail"],
        is_gf_friendly=True,
        number_of_employees=6,
        product_categories=[taxonomy_set["clothing"]],
        ownership_markers=[taxonomy_set["bipoc_owned"]],
        sustainability_markers=[taxonomy_set["vintage"]],
    )
    return company_one, company_two
