import django_filters

from .models import Company


class NumberInFilter(django_filters.BaseInFilter, django_filters.NumberFilter):
    pass


class CharInFilter(django_filters.BaseInFilter, django_filters.CharFilter):
    pass


class CompanyFilterSet(django_filters.FilterSet):
    city = django_filters.CharFilter(field_name="city", lookup_expr="iexact")
    state = django_filters.CharFilter(field_name="state", lookup_expr="iexact")
    country = django_filters.CharFilter(field_name="country", lookup_expr="iexact")
    business_category = django_filters.CharFilter(
        field_name="business_category__name",
        lookup_expr="iexact",
    )
    product_categories = CharInFilter(
        field_name="product_categories__name",
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
