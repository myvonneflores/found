# Deployment

Status on March 13, 2026:
- Production deploy is live and healthy for both `found-api` and `found-web`
- GitHub Actions auto-deploys both apps on merge or push to `main`

## Recommended topology
- Fly app for the Django API: `found-api`
- Fly app for the Next.js frontend: `found-web`
- Postgres database in the same Fly region (`lax`)

## 1. Create the Fly apps

From the repository root:

```bash
fly launch --no-deploy
```

From `frontend/`:

```bash
fly launch --no-deploy
```

Use the app names already set in `fly.toml`:
- `found-api`
- `found-web`

## 2. Create the database

Create a Postgres database and note the connection string:

```bash
fly postgres create
```

## 3. Set backend secrets

From the repository root:

```bash
fly secrets set \
  SECRET_KEY="<strong-random-secret>" \
  DEBUG="False" \
  DATABASE_URL="<postgres-connection-string>" \
  ALLOWED_HOSTS="found-api.fly.dev,api.found-places.com" \
  CORS_ALLOWED_ORIGINS="https://www.found-places.com,https://found-places.com,https://found-web.fly.dev" \
  CSRF_TRUSTED_ORIGINS="https://www.found-places.com,https://found-places.com,https://found-web.fly.dev"
```

## 4. Set frontend secrets

From `frontend/`:

```bash
fly secrets set \
  API_BASE_URL="https://api.found-places.com/api" \
  SITE_URL="https://www.found-places.com"
```

## 5. Deploy

Deploy the API first:

```bash
fly deploy
```

Deploy the frontend second from `frontend/`:

```bash
fly deploy
```

## 6. Attach domains

Attach the domains in Fly before editing DNS:

```bash
fly certs add api.found-places.com
```

From `frontend/`:

```bash
fly certs add found-places.com
fly certs add www.found-places.com
```

## 7. Update Squarespace DNS

Create records using the values Fly shows for each certificate:
- `api` as a `CNAME` to the API Fly target
- `www` as a `CNAME` to the frontend Fly target
- apex `found-places.com` as the `A` and `AAAA` records Fly provides for the frontend

## 8. Verify

- `https://api.found-places.com/api/health/`
- `https://www.found-places.com/healthz`
- `https://www.found-places.com/companies`

## 9. Auto-deploy from GitHub

This repository now includes a GitHub Actions workflow at `.github/workflows/fly-deploy.yml`.

To enable auto-deploys on merge or push to `main`:

1. In the GitHub repo settings, add these secrets:
   - `FLY_API_TOKEN_FOUND_API`
   - `FLY_API_TOKEN_FOUND_WEB`
2. Use a token for each Fly app:
   - `FLY_API_TOKEN_FOUND_API` should be authorized for `found-api`
   - `FLY_API_TOKEN_FOUND_WEB` should be authorized for `found-web`
3. Merge to `main` or run the workflow manually from the Actions tab.

The workflow deploys:
- the Django API from the repository root
- the Next.js frontend from `frontend/`
