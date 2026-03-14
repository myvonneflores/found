from django.urls import path

from . import views

app_name = "users"

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("me/", views.MeView.as_view(), name="me"),
    path("me/profile/", views.PersonalProfileView.as_view(), name="me-profile"),
    path("public-profiles/<slug:public_slug>/", views.PublicProfileDetailView.as_view(), name="public-profile-detail"),
    path("business-claims/", views.BusinessClaimListCreateView.as_view(), name="business-claim-list"),
    path("business-claims/<int:pk>/", views.BusinessClaimDetailView.as_view(), name="business-claim-detail"),
]
