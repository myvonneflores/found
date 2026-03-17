# AGENTS.md

## Purpose

Use this file as the first-stop orientation guide for coding agents working in `found`.
It should reflect the code that exists now, not the code we once planned to build.

## Product Snapshot

FOUND is a two-service web app:

- A Django 5.1 + DRF API in the repo root
- A Next.js 16 + React 19 frontend in [`frontend/`](./frontend)

The app currently centers on four product areas:

- company discovery and public company profiles
- accounts, auth, and dashboards
- community tools like favorites, curated lists, and personal-user listing contributions
- business claims plus verified owner editing flows

## Repo Map

- [`config/`](./config): Django settings, root URLs, API URL composition
- [`companies/`](./companies): company model, taxonomies, filters, company APIs, import/audit commands
- [`community/`](./community): favorites, curated lists, recommendations, public list APIs
- [`users/`](./users): custom user model, personal profiles, business claims, auth/profile APIs
- [`frontend/app/`](./frontend/app): App Router pages
- [`frontend/components/`](./frontend/components): client UI, dashboards, save flows, owner tools
- [`frontend/lib/api.ts`](./frontend/lib/api.ts): typed API client used across the frontend
- [`frontend/components/auth-provider.tsx`](./frontend/components/auth-provider.tsx): client auth/session hydration
- [`frontend/types/`](./frontend/types): shared TypeScript contracts for frontend API usage
- [`tests/`](./tests): cross-app API contract tests
- [`docs/`](./docs): architecture notes, feature docs, setup docs, historical rollout context

## Local Workflow

Start the full stack:

```bash
docker compose up --build
```

Key services:

- Django API: `http://localhost:8000`
- Next.js frontend: `http://localhost:3000`
- Postgres: `localhost:5432`

Seed company data:

```bash
docker compose run --rm --entrypoint /bin/sh web -lc \
  'python manage.py migrate --noinput && python manage.py import_companies /app/data/companies_enriched.csv'
```

Recommended verification commands:

```bash
docker compose run --rm web python manage.py check
docker compose run --rm web pytest
docker compose run --rm frontend sh -lc 'npm install && npm run build'
```

## Current Architecture Conventions

### Backend

- Keep domain behavior inside the existing Django apps unless the boundary is genuinely new.
- `companies` owns public directory data, taxonomy-backed listing creation, provenance metadata for imported/owner/community listings, and the verified business management endpoint.
- `community` owns favorites, curated lists, list items, recommendations, and public list exposure.
- `users` owns auth, account type behavior, public profiles, profile badges, and business claim workflows.
- API responses are part of the contract. If a serializer shape changes, update or add tests in [`tests/test_api_shapes.py`](./tests/test_api_shapes.py) and any app-specific tests.

### Frontend

- Public discovery pages are primarily server-rendered in `frontend/app/*` and fetch through [`frontend/lib/api.ts`](./frontend/lib/api.ts).
- Authenticated dashboards and owner tools are client components that rely on [`AuthProvider`](./frontend/components/auth-provider.tsx), local storage session persistence, and JWT bearer tokens.
- When adding an endpoint, add a typed wrapper in [`frontend/lib/api.ts`](./frontend/lib/api.ts) and update the matching types in [`frontend/types/`](./frontend/types).
- Reuse the current route structure before inventing a new one. The app already has stable surfaces for `/companies`, `/account`, `/business/*`, `/profiles/[publicSlug]`, and `/lists/[idHash]`.

### Product and UX

- The company detail page is the source of truth for public company presentation and verified owner editing.
- Personal users can add businesses after signup from the account area without changing the signup flow.
- Community-submitted listings publish with a `Community Listed` badge until a verified owner claim exists.
- Business verification gates editing, while broader community tools remain available based on current account rules in code.
- Preserve metadata and canonical URL behavior on public pages when changing route-level rendering.

## Docs To Read Before Bigger Changes

- [`docs/README.md`](./docs/README.md): docs map
- [`docs/development.md`](./docs/development.md): setup and local development
- [`docs/architecture.md`](./docs/architecture.md): current system architecture
- [`docs/features/discovery-and-company-profiles.md`](./docs/features/discovery-and-company-profiles.md)
- [`docs/features/accounts-and-dashboards.md`](./docs/features/accounts-and-dashboards.md)
- [`docs/features/community-and-sharing.md`](./docs/features/community-and-sharing.md)
- [`docs/features/business-claims-and-owner-tools.md`](./docs/features/business-claims-and-owner-tools.md)

Historical but still useful context:

- [`docs/account-and-community-spec.md`](./docs/account-and-community-spec.md)
- [`docs/2026-03-14-account-dashboard-business-summary.md`](./docs/2026-03-14-account-dashboard-business-summary.md)

## Working Agreement For Future Docs

- Prefer small, current docs over long speculative specs.
- Mark historical docs clearly instead of silently treating them as source of truth.
- When a feature boundary changes, update both this file and the most relevant page under [`docs/features/`](./docs/features).
