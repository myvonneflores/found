# FOUND Architecture

## Why This Doc Exists

This document describes how FOUND is structured today so product and engineering decisions can start from the real codebase instead of historical plans.

Use it for:

- onboarding into the repository
- deciding where a new feature belongs
- understanding how data moves between the frontend and backend
- spotting the architectural tradeoffs we already live with

## System Overview

FOUND is a split web application:

- a Django 5.1 + Django REST Framework backend in the repository root
- a Next.js 16 + React 19 frontend in [`../frontend/`](../frontend)
- a Postgres database used in local Docker and deployment environments

At a high level:

- Django owns domain models, permissions, persistence, and the public/private API surface.
- Next.js owns public discovery pages, authenticated dashboards, and presentation-layer orchestration.
- The frontend talks to the backend exclusively through JSON APIs under `/api/`.

## Local Runtime Topology

Local development uses `docker compose` with three services:

- `db`: Postgres 16
- `web`: Django application
- `frontend`: Next.js application

Relevant local URLs:

- frontend: `http://localhost:3000`
- backend API: `http://localhost:8000/api`
- backend admin: `http://localhost:8000/admin`

The frontend is configured to talk to the backend differently depending on where it runs:

- inside Docker: `NEXT_PUBLIC_API_BASE_URL=http://web:8000/api`
- outside Docker fallback in code: `http://127.0.0.1:8000/api`

This split matters any time you are debugging network requests or adding a new environment variable.

## Deployment Shape

The repo contains deployment configuration for both services:

- the backend is containerized from [`../Dockerfile`](../Dockerfile)
- the frontend has its own deploy config in [`../frontend/fly.toml`](../frontend/fly.toml)
- the root repo also has [`deployment.md`](./deployment.md) and [`deployment-status.md`](./deployment-status.md) for operational notes

The backend image installs Poetry dependencies, copies the repo, and runs `collectstatic` at build time.

## Architectural Principles In Practice

These are the patterns the current codebase already follows:

- keep domain logic close to the Django app that owns the data
- expose business rules in the API layer, not only in the frontend
- use typed frontend API wrappers rather than ad hoc `fetch` calls throughout components
- treat serializer output as a client contract
- prefer using existing route surfaces over adding new ones unless the UX boundary is clearly different

## Backend Architecture

### Core configuration layer

Key backend entry points:

- [`../config/settings.py`](../config/settings.py): environment-driven Django settings
- [`../config/urls.py`](../config/urls.py): root URL config
- [`../config/api_urls.py`](../config/api_urls.py): API routing and auth endpoints
- [`../core/models.py`](../core/models.py): shared `BaseModel`

The shared `BaseModel` adds:

- numeric primary key `id`
- public-friendly `id_hash`
- `created_at`
- `updated_at`

Most product models either inherit from this directly or sit close to models that do.

### Domain app ownership

#### `companies`

[`../companies/`](../companies) owns:

- `Company`
- taxonomy models like `BusinessCategory`, `OwnershipMarker`, and `SustainabilityMarker`
- company filtering/search
- public directory endpoints
- public company detail endpoints
- verified business management of a company profile
- company import and editorial utility commands

Important files:

- models: [`../companies/models.py`](../companies/models.py)
- filters: [`../companies/filters.py`](../companies/filters.py)
- serializers: [`../companies/serializers.py`](../companies/serializers.py)
- views: [`../companies/views.py`](../companies/views.py)

#### `community`

[`../community/`](../community) owns:

- favorites
- curated lists
- ordered list items
- recommendations
- public list exposure
- public recommendation exposure

Important files:

- models: [`../community/models.py`](../community/models.py)
- serializers: [`../community/serializers.py`](../community/serializers.py)
- views: [`../community/views.py`](../community/views.py)

#### `users`

[`../users/`](../users) owns:

- the custom `User` model
- account type state
- personal profiles
- business claims
- registration
- current-user APIs
- public curator profiles
- JWT login response enrichment

Important files:

- models: [`../users/models.py`](../users/models.py)
- serializers: [`../users/serializers.py`](../users/serializers.py)
- views: [`../users/views.py`](../users/views.py)

### API style and conventions

The backend primarily uses DRF generic views and model serializers.

Common patterns:

- `AllowAny` on public discovery and public profile/list endpoints
- `IsAuthenticated` on account, community, and business management endpoints
- `select_related` and `prefetch_related` used in view querysets to support nested serializer output efficiently
- serializer validation used to enforce product rules, such as public sharing restrictions for unverified business users

### API contract shapes

The app intentionally uses different response shapes for different use cases:

- company list endpoints return flattened string-heavy payloads for browsing efficiency
- company detail endpoints return nested taxonomy objects for richer detail pages
- management serializers accept primary keys for editable relationships

That means the list serializer, detail serializer, and write serializer are intentionally not identical. This is a design decision, not an inconsistency to "clean up" automatically.

### Filtering model

The company directory uses [`../companies/filters.py`](../companies/filters.py).

Current filter behavior includes:

- exact-ish location fields like city, state, and country
- taxonomy-based filters via names
- boolean filters like vegan-friendly and gluten-free-friendly
- range filters for founded year and employee counts

The city filter is special: it resolves through a canonicalization helper so query behavior can tolerate city variants.

## Frontend Architecture

### App Router structure

The frontend uses the Next.js App Router under [`../frontend/app/`](../frontend/app).

High-signal routes:

- [`../frontend/app/page.tsx`](../frontend/app/page.tsx): home page
- [`../frontend/app/companies/page.tsx`](../frontend/app/companies/page.tsx): company discovery shell
- [`../frontend/app/companies/[slug]/page.tsx`](../frontend/app/companies/%5Bslug%5D/page.tsx): company detail and owner edit entry point
- [`../frontend/app/account/page.tsx`](../frontend/app/account/page.tsx): personal dashboard
- [`../frontend/app/business/claim/page.tsx`](../frontend/app/business/claim/page.tsx): claim submission
- [`../frontend/app/business/pending/page.tsx`](../frontend/app/business/pending/page.tsx): pending business state
- [`../frontend/app/business/dashboard/page.tsx`](../frontend/app/business/dashboard/page.tsx): verified business dashboard
- [`../frontend/app/business/company/page.tsx`](../frontend/app/business/company/page.tsx): create-or-redirect business profile route
- [`../frontend/app/profiles/[publicSlug]/page.tsx`](../frontend/app/profiles/%5BpublicSlug%5D/page.tsx): public user profiles
- [`../frontend/app/lists/[idHash]/page.tsx`](../frontend/app/lists/%5BidHash%5D/page.tsx): public curated lists

### Layout and providers

The root layout is [`../frontend/app/layout.tsx`](../frontend/app/layout.tsx).

It currently does three important things:

- defines site-wide metadata
- applies the shared font setup
- wraps the app in [`../frontend/components/auth-provider.tsx`](../frontend/components/auth-provider.tsx)

Because auth is bootstrapped in a client provider, server components do not have first-class access to authenticated session state today.

### Data-fetching model

The frontend intentionally uses two data-fetching modes.

#### 1. Public server-rendered fetching

Public pages mostly fetch data from server components through [`../frontend/lib/api.ts`](../frontend/lib/api.ts).

Examples:

- home page featured company selection
- company directory filters and selected detail preview
- company detail page rendering

These reads often use Next.js caching or revalidation behavior through `fetch`.

#### 2. Authenticated client-side fetching

Authenticated dashboards and owner tools are mostly client components.

Examples:

- `/account`
- `/business/dashboard`
- owner editing on the company detail page
- company profile creation

These flows rely on:

- [`../frontend/components/auth-provider.tsx`](../frontend/components/auth-provider.tsx)
- [`../frontend/lib/auth-storage.ts`](../frontend/lib/auth-storage.ts)
- bearer tokens sent through helper methods in [`../frontend/lib/api.ts`](../frontend/lib/api.ts)

This split is one of the most important architectural constraints in the app.

## Auth And Session Architecture

### Current auth model

The backend uses SimpleJWT for token issuance and refresh.

Relevant endpoints live in [`../config/api_urls.py`](../config/api_urls.py):

- `POST /api/auth/token/`
- `POST /api/auth/token/refresh/`
- `POST /api/auth/token/verify/`

The custom token serializer also returns serialized user data and includes account-related claims.

### Frontend session lifecycle

The session lifecycle is:

1. user logs in or registers
2. frontend stores `{access, refresh, user}` in browser local storage
3. `AuthProvider` loads on app start
4. provider calls `users/me/` using the access token
5. if that fails, provider attempts token refresh
6. if refresh succeeds, provider rewrites local storage and hydrates the user
7. if refresh fails, provider clears the session

This gives the app a practical persistent login flow without server-side session rendering.

### Authorization model

Authorization is enforced in both layers, but the backend is the source of truth.

Examples:

- only personal users may access personal profile editing
- only business users may access business claims
- only verified business users may manage a company profile
- public community surfaces remain unauthenticated where appropriate

The frontend adds route-level redirects for UX, but those should never be treated as the only protection.

## Data Model Relationships

The most important relationships are:

- a `User` has an `account_type`
- a `User` may have one `PersonalProfile`
- a `User` may have many `BusinessClaim`s
- a verified business claim may connect a user to a `Company`
- a `User` may create many `Favorite`s
- a `User` may create many `CuratedList`s
- a `CuratedList` may contain many ordered `CuratedListItem`s
- a `User` may create many `Recommendation`s

Two relationships drive a lot of product behavior:

- `User.is_business_verified` is derived from business claims
- public sharing for lists, recommendations, and profiles depends on model state plus permission rules

## Important Request Flows

### Public company discovery

1. a public route in Next.js requests data through `frontend/lib/api.ts`
2. Django serves filtered company or taxonomy data
3. the page renders server-side
4. deeper interactions on company pages may hand off to client components for auth-aware actions like favorites or owner editing

### Personal dashboard

1. route loads as a client page
2. `AuthProvider` exposes access token and current user
3. dashboard requests favorites, lists, and personal profile
4. the page renders private community state and public-profile controls

### Business owner path

1. business user signs up and submits a claim
2. backend stores claim state in `BusinessClaim`
3. verified status unlocks business dashboard routing
4. `/business/company` either redirects into an existing company page in edit mode or renders the create-company form
5. owner edits write through the managed company API endpoint

## Testing And Contract Safety

There are two important testing layers to keep in mind:

- app-specific tests inside each Django app
- cross-app API shape tests in [`../tests/test_api_shapes.py`](../tests/test_api_shapes.py)

The API shape tests are especially important because the frontend depends on stable field names and nested object structures. If you change serializer output, expect to update tests and the typed frontend contracts together.

## Architectural Edges And Tradeoffs

These are the main constraints worth remembering before large changes:

- authenticated state is client-side, so server components cannot easily render personalized secure state
- the frontend deliberately mixes SSR for public routes and client fetching for private routes
- list, detail, and management serializers for the same resource often differ on purpose
- some historical docs in `docs/` describe earlier product decisions and should not override current code behavior

None of these are blockers, but each should influence how new work is shaped.

## How To Extend The System Safely

### When adding backend work

- prefer extending `companies`, `community`, or `users` before adding a new app
- keep permission rules in Django views and serializers
- update or add tests when serializer shapes or business rules change
- use `select_related` and `prefetch_related` when introducing nested output

### When adding frontend work

- add a typed wrapper in [`../frontend/lib/api.ts`](../frontend/lib/api.ts) for new endpoints
- update the matching interfaces in [`../frontend/types/`](../frontend/types)
- decide early whether the route is public-SSR, authenticated-client, or hybrid
- preserve metadata and canonical URL behavior on public pages

### When adding docs

- update the relevant feature doc under [`./features/`](./features)
- update [`../AGENTS.md`](../AGENTS.md) if the repo workflow or core boundaries changed
- keep implementation docs current and move older thinking into clearly historical notes rather than mixing them together
