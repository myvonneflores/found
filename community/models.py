from django.conf import settings
from django.db import models

from core.models import BaseModel


class Favorite(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favorites",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="favorited_by",
    )

    class Meta:
        ordering = ["-created_at", "-pk"]
        constraints = [
            models.UniqueConstraint(fields=["user", "company"], name="unique_favorite_per_user_company"),
        ]

    def __str__(self):
        return f"{self.user.email} -> {self.company.name}"


class CuratedList(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="curated_lists",
    )
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=False)

    class Meta:
        ordering = ["-updated_at", "-pk"]

    def __str__(self):
        return self.title


class CuratedListItem(BaseModel):
    curated_list = models.ForeignKey(
        CuratedList,
        on_delete=models.CASCADE,
        related_name="items",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="list_items",
    )
    note = models.TextField(blank=True)
    position = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["position", "created_at", "pk"]
        constraints = [
            models.UniqueConstraint(fields=["curated_list", "company"], name="unique_company_per_curated_list"),
        ]

    def __str__(self):
        return f"{self.curated_list.title}: {self.company.name}"


class Recommendation(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recommendations",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="recommendations",
    )
    title = models.CharField(max_length=140)
    body = models.TextField()
    is_public = models.BooleanField(default=True)

    class Meta:
        ordering = ["-updated_at", "-pk"]

    def __str__(self):
        return f"{self.title} -> {self.company.name}"
