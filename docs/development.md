# Development

## Local stack
- Django API: `http://localhost:8000`
- Next.js frontend: `http://localhost:3000`

Start the full stack:

```bash
docker compose up --build
```

This starts:
- `db` for Postgres
- `web` for Django + DRF
- `frontend` for the SSR React app

## Seed data
The repository includes a seed CSV at `data/companies_enriched.csv`.

Load it into the local database:

```bash
docker compose run --rm --entrypoint /bin/sh web -lc \
  'python manage.py migrate --noinput && python manage.py import_companies /app/data/companies_enriched.csv'
```

## Verification
Run backend checks:

```bash
docker compose run --rm --entrypoint /bin/sh web -lc \
  'python manage.py check && python manage.py test companies'
```

Run a frontend production build:

```bash
docker compose run --rm frontend sh -lc 'npm install && npm run build'
```

## Notes
- The frontend fetches API data server-side from `http://web:8000/api` inside Docker.
- Public company pages are available at `/companies` and `/companies/<slug>`.
- The contact form runs through the Next.js app, so email-related variables such as `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, and `CONTACT_FROM_EMAIL` need to be available to the `frontend` service in `.env`.
- If `3000`, `5432`, or `8000` are already in use on your machine, override them when starting Compose:

```bash
FOUND_FRONTEND_PORT=3001 FOUND_WEB_PORT=8001 FOUND_DB_PORT=5433 docker compose up --build
```
