from django.db import migrations, models
from django.db.models import Q
from django.db.models.functions import Lower


DISPLAY_NAME_MAX_LENGTH = 120


def normalize_display_name(value):
    return " ".join((value or "").strip().split())


def ensure_unique_suffix(base_name, counter):
    suffix = f" {counter}"
    trimmed_base = base_name[: max(0, DISPLAY_NAME_MAX_LENGTH - len(suffix))].rstrip()
    return f"{trimmed_base}{suffix}" if trimmed_base else str(counter)


def backfill_duplicate_personal_display_names(apps, schema_editor):
    User = apps.get_model("users", "User")
    seen_names = set()

    for user in User.objects.filter(account_type="personal").exclude(display_name="").order_by("id"):
        normalized_name = normalize_display_name(user.display_name)
        if not normalized_name:
            continue

        candidate = normalized_name
        counter = 2
        changed = candidate != user.display_name

        while candidate.lower() in seen_names:
            candidate = ensure_unique_suffix(normalized_name, counter)
            counter += 1
            changed = True

        seen_names.add(candidate.lower())

        if not changed:
            continue

        user.display_name = candidate
        user.needs_display_name_review = True
        user.save(update_fields=["display_name", "needs_display_name_review"])


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0011_businessclaim_decision_reason_code_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="needs_display_name_review",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(backfill_duplicate_personal_display_names, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="user",
            constraint=models.UniqueConstraint(
                Lower("display_name"),
                condition=Q(account_type="personal") & ~Q(display_name=""),
                name="users_personal_display_name_ci_unique",
            ),
        ),
    ]
