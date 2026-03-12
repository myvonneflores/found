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

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(2)
try:
    s.connect((host, port))
    s.close()
    raise SystemExit(0)
except OSError:
    raise SystemExit(1)
" 2>/dev/null; do
    sleep 1
done
echo "PostgreSQL is ready."

echo "Running migrations..."
python manage.py migrate --noinput

exec "$@"
