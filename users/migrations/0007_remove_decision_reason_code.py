from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_backfill_personal_profiles'),
    ]

    operations = [
        migrations.RunSQL(
            sql='ALTER TABLE users_businessclaim DROP COLUMN IF EXISTS decision_reason_code;',
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
