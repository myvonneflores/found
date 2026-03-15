from django.db import connection, migrations

ORPHANED_COLUMNS = [
    'resubmitted_at',
    'review_checklist',
    'submitter_first_name',
    'submitter_last_name',
]


def drop_orphaned_columns(apps, schema_editor):
    if connection.vendor != 'postgresql':
        return
    with schema_editor.connection.cursor() as cursor:
        for col in ORPHANED_COLUMNS:
            cursor.execute(
                f'ALTER TABLE users_businessclaim '
                f'DROP COLUMN IF EXISTS "{col}";'
            )


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0009_drop_resubmission_count'),
    ]

    operations = [
        migrations.RunPython(drop_orphaned_columns, migrations.RunPython.noop),
    ]
