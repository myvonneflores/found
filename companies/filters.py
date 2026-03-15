import django_filters
from django.db.models import Q
from django.utils.text import smart_split

from .cities import city_filter_variants
from .models import Company


class NumberInFilter(django_filters.BaseInFilter, django_filters.NumberFilter):
    pass


class CharInFilter(django_filters.BaseInFilter, django_filters.CharFilter):
    pass


class CompanyFilterSet(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")
    city = django_filters.CharFilter(method="filter_city")
    state = django_filters.CharFilter(field_name="state", lookup_expr="iexact")
    country = django_filters.CharFilter(field_name="country", lookup_expr="iexact")
    business_category = django_filters.CharFilter(method="filter_business_category")
    product_categories = CharInFilter(
        field_name="product_categories__name",
    )
    ownership_markers = CharInFilter(
        field_name="ownership_markers__name",
    )
    sustainability_markers = CharInFilter(
        field_name="sustainability_markers__name",
    )
    is_vegan_friendly = django_filters.BooleanFilter(field_name="is_vegan_friendly")
    is_gf_friendly = django_filters.BooleanFilter(field_name="is_gf_friendly")
    founded_year_min = django_filters.NumberFilter(
        field_name="founded_year",
        lookup_expr="gte",
    )
    founded_year_max = django_filters.NumberFilter(
        field_name="founded_year",
        lookup_expr="lte",
    )
    employees_min = django_filters.NumberFilter(
        field_name="number_of_employees",
        lookup_expr="gte",
    )
    employees_max = django_filters.NumberFilter(
        field_name="number_of_employees",
        lookup_expr="lte",
    )

    class Meta:
        model = Company
        fields = []

    search_text_fields = (
        "name",
        "description",
        "website",
        "address",
        "city",
        "state",
        "zip_code",
        "country",
        "instagram_handle",
    )
    search_related_fields = (
        "business_category__name",
        "business_category__description",
        "business_categories__name",
        "business_categories__description",
        "product_categories__name",
        "product_categories__description",
        "cuisine_types__name",
        "cuisine_types__description",
        "ownership_markers__name",
        "ownership_markers__description",
        "sustainability_markers__name",
        "sustainability_markers__description",
    )
    search_flag_aliases = {
        "is_vegan_friendly": ("vegan", "vegan-friendly", "vegan friendly"),
        "is_gf_friendly": ("gluten-free", "gluten free", "gf", "gluten-free-friendly"),
    }

    def filter_search(self, queryset, name, value):
        terms = [term.strip("\"'") for term in smart_split(value or "") if term.strip("\"'")]
        if not terms:
            return queryset

        for term in terms:
            term_query = Q()

            for field_name in self.search_text_fields:
                term_query |= Q(**{f"{field_name}__icontains": term})

            for field_name in self.search_related_fields:
                term_query |= Q(**{f"{field_name}__icontains": term})

            lowered_term = term.lower()
            for flag_name, aliases in self.search_flag_aliases.items():
                if any(lowered_term in alias for alias in aliases):
                    term_query |= Q(**{flag_name: True})

            queryset = queryset.filter(term_query)

        return queryset.distinct()

    def filter_city(self, queryset, name, value):
        variants = city_filter_variants(value)
        if not variants:
            return queryset
        return queryset.filter(city__in=variants)

    def filter_business_category(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(
            Q(business_category__name__iexact=value) | Q(business_categories__name__iexact=value)
        ).distinct()
