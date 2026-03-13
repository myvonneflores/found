# Deployment Status

Last updated: March 13, 2026

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
- Frontend health check is in place and working:
  - `https://www.found-places.com/healthz`

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

### Frontend / product work

- Shared header/menu was added and reused across Search, About, Contact, and company detail pages.
- Search menu input behavior was fixed so stale search text does not stick.
- Company detail page layout, spacing, and color treatment were redesigned.
- About page was rewritten and styled.
- Contact page was redesigned and connected to HubSpot through the custom form API route.

## Current blocker

The backend deploy is hanging during Fly machine health validation.

### What we know

- The release command succeeds:
  - `python manage.py migrate --noinput`
- The web machine does start Gunicorn and bind to:
  - `0.0.0.0:8000`
- Fly still does not mark the machine healthy.
- Because no machine is considered healthy, public API traffic is rejected with:
  - `no known healthy instances found for route tcp/443`

### Recent fixes already attempted

- Added a backend Fly health check in `fly.toml`
- Moved migrations to Fly `release_command`
- Moved static file collection into the Docker build
- Simplified runtime startup so the web process can start faster
- Expanded Django `ALLOWED_HOSTS` to include:
  - `localhost`
  - `127.0.0.1`
  - `0.0.0.0`
- Added an explicit Fly health-check `Host` header:
  - `Host = "api.found-places.com"`

## Most likely current issue

The app process appears healthy from startup logs, but Fly still does not accept the machine as healthy enough to route traffic.

This likely needs one focused pass on Fly-side health behavior, not product code changes.

## Recommended next debugging steps

1. Check the current machine directly after deploy:
   - `fly machine status <machine-id> -a found-api`
2. Inspect Fly logs during the health-check window:
   - `fly logs -a found-api`
3. Confirm the health endpoint from inside the machine with an explicit host header if needed.
4. If Fly still rejects the machine, consider one of these narrowed follow-ups:
   - increase health check `grace_period`
   - switch to a simpler top-level HTTP check shape if Fly's nested check config is not being interpreted as expected
   - temporarily set `min_machines_running = 1` during stabilization
   - verify whether Fly is probing with an unexpected host or over a different internal path than expected

## Important note

The site itself is mostly deployed and working. The remaining problem is backend health classification on Fly, not the overall domain setup or app wiring.
