from django.db import connection, migrations

# Columns that the Django model actually defines
EXPECTED_COLUMNS = {
    'id', 'user_id', 'company_id', 'status', 'business_name',
    'business_email', 'business_phone', 'website', 'instagram_handle',
    'facebook_page', 'linkedin_page', 'role_title', 'claim_message',
    'submitted_at', 'reviewed_at', 'reviewed_by_id', 'review_notes',
}


def drop_orphaned_columns(apps, schema_editor):
    if connection.vendor != 'postgresql':
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'users_businessclaim';"
        )
        db_columns = {row[0] for row in cursor.fetchall()}
        orphaned = db_columns - EXPECTED_COLUMNS
        for col in orphaned:
            cursor.execute(
                f'ALTER TABLE users_businessclaim DROP COLUMN IF EXISTS "{col}";'
            )


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0007_remove_decision_reason_code'),
    ]

    operations = [
        migrations.RunPython(drop_orphaned_columns, migrations.RunPython.noop),
    ]
