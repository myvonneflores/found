#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
while ! python -c "
import os
import socket
from urllib.parse import urlparse

database_url = os.environ.get('DATABASE_URL', 'postgres://postgres:postgres@db:5432/found')
parsed = urlparse(database_url)
host = parsed.hostname or 'db'
port = parsed.port or 5432

try:
    with socket.create_connection((host, port), timeout=2):
        raise SystemExit(0)
except OSError:
    raise SystemExit(1)
" 2>/dev/null; do
    sleep 1
done
echo "PostgreSQL is ready."

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Running migrations..."
python manage.py migrate --noinput

exec "$@"
