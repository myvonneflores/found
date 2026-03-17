# Accounts And Dashboards

## Why This Doc Exists

This doc covers how FOUND handles account creation, login, session persistence, account-type state, and dashboard routing.

It is the implementation guide for:

- who a user is in the system
- how auth state reaches the frontend
- how personal and business users diverge after login
- where profile editing currently lives

## Feature Scope

This area includes:

- registration
- login
- JWT session handling
- current-user hydration
- personal profile editing
- personal-user listing contribution entry points
- personal dashboard routing
- pending business dashboard routing
- verified business dashboard routing

It does not fully document:

- public profiles
- curated lists and recommendations as feature domains
- business claims as an operational workflow
- company owner editing

Those connect to this area, but are documented separately.

## Source Of Truth

Primary backend files:

- [`../../users/models.py`](../../users/models.py)
- [`../../users/managers.py`](../../users/managers.py)
- [`../../users/serializers.py`](../../users/serializers.py)
- [`../../users/views.py`](../../users/views.py)
- [`../../config/api_urls.py`](../../config/api_urls.py)

Primary frontend files:

- [`../../frontend/app/signup/page.tsx`](../../frontend/app/signup/page.tsx)
- [`../../frontend/app/login/page.tsx`](../../frontend/app/login/page.tsx)
- [`../../frontend/app/account/page.tsx`](../../frontend/app/account/page.tsx)
- [`../../frontend/app/business/pending/page.tsx`](../../frontend/app/business/pending/page.tsx)
- [`../../frontend/app/business/dashboard/page.tsx`](../../frontend/app/business/dashboard/page.tsx)
- [`../../frontend/components/auth-provider.tsx`](../../frontend/components/auth-provider.tsx)
- [`../../frontend/lib/auth-storage.ts`](../../frontend/lib/auth-storage.ts)
- [`../../frontend/lib/api.ts`](../../frontend/lib/api.ts)
- [`../../frontend/types/auth.ts`](../../frontend/types/auth.ts)
- [`../../frontend/components/business-profile-card.tsx`](../../frontend/components/business-profile-card.tsx)

## Account Model

The central account model is `users.User` in [`../../users/models.py`](../../users/models.py).

Important account fields:

- `email`: unique auth identity
- `account_type`: `personal` or `business`
- `display_name`
- `public_slug`
- `onboarding_completed`

The app does not use `username`; auth is email-based.

### Derived account state

Two pieces of business state are derived rather than manually stored:

- `is_business_verified`
- `business_verification_status`

These are computed from related `BusinessClaim` records.

That means business verification should be treated as claim-driven state, not a free-floating user flag.

## Related Models

### `PersonalProfile`

`PersonalProfile` stores:

- `bio`
- `avatar_url`
- `location`
- `is_public`

Only personal users can access this profile through the authenticated profile endpoint.

### `BusinessClaim`

`BusinessClaim` stores the business onboarding and review state used to determine:

- whether a business user is pending, verified, or rejected
- which business they may manage
- which dashboard state they should see

## User Creation Behavior

User creation is handled through the custom manager in [`../../users/managers.py`](../../users/managers.py).

Important current behavior:

- all users are created by email
- passwords are hashed through `set_password`
- personal users automatically get a `PersonalProfile`
- business users do not automatically get a `PersonalProfile`

That automatic profile creation is an important implementation detail because the personal dashboard assumes the profile endpoint is available.

## Backend Auth And Account Endpoints

Relevant endpoints:

- `POST /api/users/register/`
- `GET/PATCH /api/users/me/`
- `GET/PATCH /api/users/me/profile/`
- `GET/POST /api/users/business-claims/`
- `GET/PATCH /api/users/business-claims/<pk>/`
- `POST /api/auth/token/`
- `POST /api/auth/token/refresh/`
- `POST /api/auth/token/verify/`

## Registration Flow

### Frontend registration UX

The signup page is implemented in [`../../frontend/app/signup/page.tsx`](../../frontend/app/signup/page.tsx).

Current UX behavior:

- the user chooses `personal` or `business`
- business users also choose an intent:
  - claim an existing business
  - add a new business
- the form collects first name, last name, display name, email, password, and password confirmation
- password confirmation is validated on the client before submit

### Current submit flow

The signup page currently does two sequential API calls:

1. `registerUser(...)`
2. `loginUser(...)`

If both succeed:

- the session is written through `signIn(...)`
- personal users are routed to `/account`
- business users are routed to `/business/claim?intent=...`

This means signup is also an immediate sign-in flow.

### Registration payload

The frontend currently sends:

- `email`
- `password`
- `first_name`
- `last_name`
- `display_name`
- `account_type`

The current frontend does not send the business intent to the backend during registration; that intent is only used for post-signup routing.

### What did not change

- personal-user signup still goes straight to `/account`
- business-user signup still goes to `/business/claim`
- the new community listing flow starts after signup from the personal account area, not during registration

## Login Flow

The login page is implemented in [`../../frontend/app/login/page.tsx`](../../frontend/app/login/page.tsx).

Current behavior:

- the page collects email and password
- successful login calls `signIn(session)`
- destination is chosen from the returned `user` payload

Current routing logic:

- personal users -> `/account`
- unverified business users -> `/business/pending`
- verified business users -> `/business/dashboard`

If the user is already authenticated when the page loads, the page redirects to that same destination logic automatically.

## JWT Session Model

### Backend token response

Login uses a custom token serializer in [`../../users/serializers.py`](../../users/serializers.py).

The token response includes:

- `access`
- `refresh`
- `user`

The `user` payload includes:

- account type
- public slug
- verification booleans/status
- derived profile badges such as `Community Contributor`

This is important because the frontend uses the login response itself to make routing decisions immediately after authentication.

### Frontend session storage

Client-side session storage lives in [`../../frontend/lib/auth-storage.ts`](../../frontend/lib/auth-storage.ts).

Current behavior:

- the full auth session is stored in local storage
- the storage key is `found-auth-session`
- the stored shape is `{ access, refresh, user }`
- corrupt stored JSON is cleared automatically

### Session hydration

Session hydration is handled by [`../../frontend/components/auth-provider.tsx`](../../frontend/components/auth-provider.tsx).

Current lifecycle:

1. read session from local storage
2. call `getCurrentUser(access)`
3. if that fails, try `refreshAccessToken(refresh)`
4. if refresh succeeds, call `getCurrentUser(newAccess)`
5. persist the refreshed session
6. if both fail, clear the session

The provider exposes:

- `accessToken`
- `isReady`
- `isAuthenticated`
- `user`
- `signIn`
- `signOut`
- `refreshUser`

This provider is the main bridge between JWT auth and the client app.

## Current User And Profile APIs

### `users/me/`

The `MeView` returns the authenticated user and allows limited patching.

Important current behavior:

- fields like `account_type` remain read-only through the serializer
- `display_name` can be updated
- business verification fields are always included in the response

### `users/me/profile/`

The personal profile endpoint is personal-user-only.

Important current behavior:

- it creates the `PersonalProfile` on first access if needed
- business users receive a `403`
- it supports updating public profile fields

This endpoint is currently the main settings-like surface for personal profile presentation.

## Dashboard Routing Model

Dashboard routing is account-type-driven and mostly enforced in client route logic, with backend endpoints enforcing permissions on the data itself.

### Personal dashboard route

The personal dashboard is [`../../frontend/app/account/page.tsx`](../../frontend/app/account/page.tsx).

Current route behavior:

- unauthenticated users are redirected to `/login`
- business users are redirected away:
  - verified -> `/business/dashboard`
  - pending/unverified -> `/business/pending`
- only personal users remain on the page

### Pending business dashboard route

The pending dashboard is [`../../frontend/app/business/pending/page.tsx`](../../frontend/app/business/pending/page.tsx).

Current route behavior:

- unauthenticated users are redirected to `/login`
- personal users are redirected to `/account`
- verified business users are redirected to `/business/dashboard`
- only unverified business users remain on the page

### Verified business dashboard route

The verified dashboard is [`../../frontend/app/business/dashboard/page.tsx`](../../frontend/app/business/dashboard/page.tsx).

Current route behavior:

- unauthenticated users are redirected to `/login`
- personal users are redirected to `/account`
- unverified business users are redirected to `/business/pending`
- only verified business users remain on the page

## Personal Dashboard

The personal dashboard currently combines three areas:

- favorites
- lists
- share/profile

### Current data loading

On load, the page fetches:

- favorites
- curated lists
- personal profile

If token-related requests fail, the user is signed out and redirected back to login.

### Current profile editing model

The share/profile column is the main place where personal users:

- edit bio
- toggle public visibility
- save profile changes
- jump to their public profile page

The public profile CTA only appears when there is some public presence:

- the profile itself is public
- or at least one list is public

This means the dashboard currently acts as both:

- the personal home base
- the lightweight profile settings surface

## Pending Business Dashboard

The pending business dashboard mirrors the broader dashboard structure but changes the share/publishing rules.

Current behavior:

- pending business users can still load favorites
- they can create and manage lists
- the UI explicitly positions those lists as private for now
- public sharing copy is present but framed as locked until verification
- the main business CTA strip renders `PENDING VERIFICATION`

This is an important product decision: pending business users are not locked out of the app, but they are gated from public business-owner capabilities.

## Verified Business Dashboard

The verified dashboard also uses the favorites/lists/share structure, but with business-oriented messaging and a business-owner CTA strip.

Current behavior:

- the user can load favorites, lists, and business claims
- the CTA strip uses `EDIT MY BUSINESS` if a claimed company exists
- if no company is linked yet, the CTA routes to `/business/company`

That CTA behavior is defined in [`../../frontend/components/business-profile-card.tsx`](../../frontend/components/business-profile-card.tsx).

## Account Types And Community Feature Access

Although this doc is focused on accounts and dashboards, one account rule matters here because it affects dashboard behavior:

- personal users can use community features
- business users can also use community features
- some public-sharing actions are additionally gated by business verification state

Examples from current behavior:

- pending business users can create favorites
- pending business users can create private lists
- pending business users cannot create public lists

This means "can use the dashboard" and "can publicly share" are not the same permission concept.

## Frontend Types And Contracts

The main auth-related TypeScript contracts live in [`../../frontend/types/auth.ts`](../../frontend/types/auth.ts).

Important shared contracts include:

- `AuthUser`
- `LoginResponse`
- `RegisterPayload`
- `BusinessClaim`

When backend serializer fields change, these types usually need to change at the same time.

## Testing Coverage

The most relevant backend coverage for this feature lives in:

- [`../../users/tests.py`](../../users/tests.py)
- [`../../community/tests.py`](../../community/tests.py)
- [`../../tests/test_api_shapes.py`](../../tests/test_api_shapes.py)

Current tested behaviors include:

- registration for personal and business account types
- automatic public slug generation
- automatic personal-profile creation for personal accounts
- login payloads for personal, pending business, and verified business users
- `me` response verification fields
- personal profile permissions and update behavior
- public-profile visibility rules
- pending business restrictions around public community sharing

## Extension Guidance

### If you need new user state

- decide whether it belongs directly on `User`, on `PersonalProfile`, or should be derived from another model
- avoid adding mutable verification flags to `User` when claim-driven state is the real source of truth

### If you change auth payloads

- update the serializer
- update [`../../frontend/types/auth.ts`](../../frontend/types/auth.ts)
- update auth/session code in [`../../frontend/components/auth-provider.tsx`](../../frontend/components/auth-provider.tsx) if needed
- update API shape tests

### If you change dashboard routing

- update both route-level redirect logic and the doc for the relevant dashboard
- be explicit about how personal, pending business, and verified business users differ

### If you add account settings

- decide whether the change belongs in:
  - `users/me/`
  - `users/me/profile/`
  - a new dedicated settings route
- avoid scattering account-editing UI across unrelated feature screens without documenting the new source of truth

## Open Questions

- Should account settings eventually become a dedicated surface instead of living partly inside the dashboard?
- Should business intent become a persisted backend field instead of a frontend-only signup routing detail?
- Should the app eventually support server-aware authenticated rendering rather than relying almost entirely on client-side session hydration?
- Should `onboarding_completed` become active product logic, or remain a mostly unused placeholder field until a fuller onboarding flow exists?
