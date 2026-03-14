from django.db import migrations, models
from django.utils.text import slugify


def populate_public_slugs(apps, schema_editor):
    User = apps.get_model("users", "User")

    for user in User.objects.all().order_by("id"):
        if user.public_slug:
            continue

        base_value = user.display_name or user.first_name or user.email.split("@")[0]
        base_slug = slugify(base_value) or "found-member"
        slug = base_slug
        counter = 2

        while User.objects.exclude(pk=user.pk).filter(public_slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        user.public_slug = slug
        user.save(update_fields=["public_slug"])


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0004_user_account_fields_personalprofile_businessclaim"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="public_slug",
            field=models.SlugField(blank=True, max_length=140, null=True, unique=True),
        ),
        migrations.RunPython(populate_public_slugs, migrations.RunPython.noop),
    ]
