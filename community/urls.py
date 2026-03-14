from django.urls import path

from . import views

app_name = "community"

urlpatterns = [
    path("favorites/", views.FavoriteListCreateView.as_view(), name="favorite-list"),
    path("favorites/<int:pk>/", views.FavoriteDetailView.as_view(), name="favorite-detail"),
    path("lists/", views.CuratedListListCreateView.as_view(), name="list-list"),
    path("lists/<int:pk>/", views.CuratedListDetailView.as_view(), name="list-detail"),
    path("lists/by-id-hash/<str:id_hash>/", views.CuratedListByHashDetailView.as_view(), name="list-detail-by-hash"),
    path("lists/<int:pk>/items/", views.CuratedListItemCreateView.as_view(), name="list-item-create"),
    path("lists/items/<int:pk>/", views.CuratedListItemDetailView.as_view(), name="list-item-detail"),
    path("public-lists/<str:id_hash>/", views.PublicCuratedListDetailView.as_view(), name="public-list-detail"),
    path("recommendations/", views.RecommendationListCreateView.as_view(), name="recommendation-list"),
    path("recommendations/<int:pk>/", views.RecommendationDetailView.as_view(), name="recommendation-detail"),
    path("public-recommendations/", views.PublicRecommendationListView.as_view(), name="public-recommendation-list"),
]
