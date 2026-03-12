from django.db import migrations

import users.managers


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0002_alter_user_managers"),
    ]

    operations = [
        migrations.AlterModelManagers(
            name="user",
            managers=[
                ("objects", users.managers.UserManager()),
            ],
        ),
    ]
