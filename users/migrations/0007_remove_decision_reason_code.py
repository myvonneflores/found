from django.db import connection, migrations


def drop_orphaned_columns(apps, schema_editor):
    if connection.vendor != 'postgresql':
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute('ALTER TABLE users_businessclaim DROP COLUMN IF EXISTS decision_reason_code;')


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_backfill_personal_profiles'),
    ]

    operations = [
        migrations.RunPython(drop_orphaned_columns, migrations.RunPython.noop),
    ]
