# Deployment Status

Last updated: March 13, 2026

## Milestone

Production deployment is now working end to end.

- `found-api` is healthy on Fly and serving `https://api.found-places.com`
- `found-web` is healthy on Fly and serving:
  - `https://www.found-places.com`
  - `https://found-places.com`
- GitHub Actions is configured to auto-deploy both apps on merge or push to `main`

## What is live

- Frontend custom domains are live:
  - `https://www.found-places.com`
  - `https://found-places.com`
- Backend custom domain is live:
  - `https://api.found-places.com`
- Frontend routes confirmed working on the live site:
  - `/companies`
  - `/about`
  - `/contact`
  - company detail pages
- Contact form submission was successfully tested on production and the submission appeared in HubSpot.

## What has been completed

### Fly setup

- Two Fly apps are configured:
  - `found-api`
  - `found-web`
- Fly config files exist:
  - `fly.toml`
  - `frontend/fly.toml`
- GitHub Actions deploy workflow exists:
  - `.github/workflows/fly-deploy.yml`
- Frontend health check is in place and working:
  - `https://www.found-places.com/healthz`
- Backend health check is in place and working:
  - `https://api.found-places.com/api/health/`

### Domain + DNS

- Squarespace DNS was updated to point `www`, apex, and `api` to Fly.
- DNS now resolves correctly for the production domains.
- Earlier `www` propagation issues have fully cleared.

### Backend

- Django production settings were added:
  - `ALLOWED_HOSTS`
  - `CORS_ALLOWED_ORIGINS`
  - `CSRF_TRUSTED_ORIGINS`
  - HTTPS / secure cookie settings
  - WhiteNoise static file support
- Backend health endpoint exists at:
  - `/api/health/`
- Entry point was updated to wait for Postgres over socket connection successfully on Fly.
- Static files are collected during the Docker build.
- Fly runs migrations through `release_command`.
- The backend health endpoint is exempted from HTTPS redirect so Fly's machine checks can pass.
- Fly's backend health check now sends the forwarded HTTPS header expected by Django.

### Frontend / product work

- Shared header/menu was added and reused across Search, About, Contact, and company detail pages.
- Search menu input behavior was fixed so stale search text does not stick.
- Company detail page layout, spacing, and color treatment were redesigned.
- About page was rewritten and styled.
- Contact page was redesigned and connected to HubSpot through the custom form API route.

## Outcome

- The backend health-check issue was resolved.
- Fly now marks `found-api` healthy and routes production traffic correctly.
- A backend-only deploy was used for the fix so unrelated frontend worktree changes were not shipped.
