from django.urls import path

from . import views

app_name = "companies"

urlpatterns = [
    path("companies/", views.CompanyListView.as_view(), name="company-list"),
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
        "sustainability-markers/",
        views.SustainabilityMarkerListView.as_view(),
        name="sustainability-marker-list",
    ),
]
