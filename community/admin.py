from django.contrib import admin

from .models import CuratedList, CuratedListItem, Favorite, Recommendation


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ("user", "company", "created_at")
    search_fields = ("user__email", "company__name")


class CuratedListItemInline(admin.TabularInline):
    model = CuratedListItem
    extra = 0


@admin.register(CuratedList)
class CuratedListAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "is_public", "updated_at")
    list_filter = ("is_public",)
    search_fields = ("title", "user__email")
    inlines = (CuratedListItemInline,)


@admin.register(Recommendation)
class RecommendationAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "company", "is_public", "updated_at")
    list_filter = ("is_public",)
    search_fields = ("title", "user__email", "company__name")
