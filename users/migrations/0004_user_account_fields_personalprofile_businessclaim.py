from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("companies", "0004_cuisinetype_company_cuisine_types"),
        ("users", "0003_alter_user_managers"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="account_type",
            field=models.CharField(
                choices=[("personal", "Personal"), ("business", "Business")],
                default="personal",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="display_name",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="user",
            name="onboarding_completed",
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name="BusinessClaim",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "status",
                    models.CharField(
                        choices=[("pending", "Pending"), ("verified", "Verified"), ("rejected", "Rejected")],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("business_name", models.CharField(max_length=255)),
                ("business_email", models.EmailField(max_length=254)),
                ("business_phone", models.CharField(blank=True, max_length=50)),
                ("website", models.URLField(blank=True)),
                ("instagram_handle", models.CharField(blank=True, max_length=100)),
                ("facebook_page", models.URLField(blank=True)),
                ("linkedin_page", models.URLField(blank=True)),
                ("role_title", models.CharField(blank=True, max_length=120)),
                ("claim_message", models.TextField(blank=True)),
                ("submitted_at", models.DateTimeField(auto_now_add=True)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "company",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="business_claims",
                        to="companies.company",
                    ),
                ),
                (
                    "reviewed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="reviewed_business_claims",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="business_claims",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                ("review_notes", models.TextField(blank=True)),
            ],
            options={
                "ordering": ["-submitted_at", "-pk"],
            },
        ),
        migrations.CreateModel(
            name="PersonalProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("bio", models.TextField(blank=True)),
                ("avatar_url", models.URLField(blank=True)),
                ("location", models.CharField(blank=True, max_length=120)),
                ("is_public", models.BooleanField(default=False)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="personal_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
    ]
