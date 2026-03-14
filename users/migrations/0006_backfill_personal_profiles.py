from django.db import migrations


def create_missing_personal_profiles(apps, schema_editor):
    User = apps.get_model("users", "User")
    PersonalProfile = apps.get_model("users", "PersonalProfile")

    existing_user_ids = set(PersonalProfile.objects.values_list("user_id", flat=True))
    missing_profiles = [
        PersonalProfile(user_id=user_id)
        for user_id in User.objects.filter(account_type="personal").exclude(id__in=existing_user_ids).values_list("id", flat=True)
    ]

    if missing_profiles:
        PersonalProfile.objects.bulk_create(missing_profiles)


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0005_user_public_slug"),
    ]

    operations = [
        migrations.RunPython(create_missing_personal_profiles, migrations.RunPython.noop),
    ]
