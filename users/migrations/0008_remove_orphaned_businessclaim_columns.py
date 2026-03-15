from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0007_remove_decision_reason_code'),
    ]

    operations = [
        migrations.RunSQL(
            sql='ALTER TABLE users_businessclaim DROP COLUMN IF EXISTS intent;',
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
