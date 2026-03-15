import django_filters
from django.db.models import Q

from .cities import city_filter_variants
from .models import Company


class NumberInFilter(django_filters.BaseInFilter, django_filters.NumberFilter):
    pass


class CharInFilter(django_filters.BaseInFilter, django_filters.CharFilter):
    pass


class CompanyFilterSet(django_filters.FilterSet):
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
