from django.urls import path

from . import views

app_name = "companies"

urlpatterns = [
    path("companies/", views.CompanyListView.as_view(), name="company-list"),
    path("companies/domain-match/", views.CompanyDomainMatchView.as_view(), name="company-domain-match"),
    path("companies/community-listings/", views.CommunityCompanyCreateView.as_view(), name="company-community-create"),
    path("companies/manage/current/", views.ManagedBusinessCompanyView.as_view(), name="company-manage-current"),
    path("companies/<slug:slug>/", views.CompanyDetailView.as_view(), name="company-detail"),
    path(
        "business-categories/",
        views.BusinessCategoryListView.as_view(),
        name="business-category-list",
    ),
    path(
        "product-categories/",
        views.ProductCategoryListView.as_view(),
        name="product-category-list",
    ),
    path(
        "cuisine-types/",
        views.CuisineTypeListView.as_view(),
        name="cuisine-type-list",
    ),
    path(
        "ownership-markers/",
        views.OwnershipMarkerListView.as_view(),
        name="ownership-marker-list",
    ),
    path(
        "sustainability-markers/",
        views.SustainabilityMarkerListView.as_view(),
        name="sustainability-marker-list",
    ),
    path(
        "cities/",
        views.CityOptionListView.as_view(),
        name="city-option-list",
    ),
]
