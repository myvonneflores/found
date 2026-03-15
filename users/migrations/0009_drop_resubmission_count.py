from django.db import connection, migrations


def drop_resubmission_count(apps, schema_editor):
    if connection.vendor != 'postgresql':
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            'ALTER TABLE users_businessclaim '
            'DROP COLUMN IF EXISTS "resubmission_count";'
        )


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0008_remove_orphaned_businessclaim_columns'),
    ]

    operations = [
        migrations.RunPython(drop_resubmission_count, migrations.RunPython.noop),
    ]
