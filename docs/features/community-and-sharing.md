# Community And Sharing

## Why This Doc Exists

This doc covers the part of FOUND where users save businesses, organize them into lists, and share that curation publicly.

It explains:

- how favorites, lists, list items, and recommendations are modeled
- which parts of the community system are private versus public
- how list sharing and public-profile browsing currently work
- which community capabilities are implemented in the API versus actively used in the current UI

## Feature Scope

This area includes:

- favorites
- curated lists
- ordered list items
- public list pages
- public profile list browsing
- recommendations
- recommendation visibility rules

It does not fully cover:

- account creation and dashboard routing
- business claim review
- company directory and company detail rendering

Those docs connect closely to this one but live elsewhere.

## Source Of Truth

Primary backend files:

- [`../../community/models.py`](../../community/models.py)
- [`../../community/serializers.py`](../../community/serializers.py)
- [`../../community/views.py`](../../community/views.py)
- [`../../community/urls.py`](../../community/urls.py)
- [`../../community/tests.py`](../../community/tests.py)

Primary frontend files:

- [`../../frontend/types/community.ts`](../../frontend/types/community.ts)
- [`../../frontend/types/profile.ts`](../../frontend/types/profile.ts)
- [`../../frontend/types/recommendation.ts`](../../frontend/types/recommendation.ts)
- [`../../frontend/lib/api.ts`](../../frontend/lib/api.ts)
- [`../../frontend/components/list-manager.tsx`](../../frontend/components/list-manager.tsx)
- [`../../frontend/components/create-list-modal.tsx`](../../frontend/components/create-list-modal.tsx)
- [`../../frontend/components/edit-list-modal.tsx`](../../frontend/components/edit-list-modal.tsx)
- [`../../frontend/components/company-save-flow.tsx`](../../frontend/components/company-save-flow.tsx)
- [`../../frontend/components/public-profile-browser.tsx`](../../frontend/components/public-profile-browser.tsx)
- [`../../frontend/components/recommendation-manager.tsx`](../../frontend/components/recommendation-manager.tsx)
- [`../../frontend/app/lists/[idHash]/page.tsx`](../../frontend/app/lists/%5BidHash%5D/page.tsx)
- [`../../frontend/app/profiles/[publicSlug]/page.tsx`](../../frontend/app/profiles/%5BpublicSlug%5D/page.tsx)

## Product Framing

Community features are the app’s curation layer.

In the current product:

- favorites are the quick-save primitive
- curated lists are the main sharing primitive
- public profile visibility depends largely on whether a user has public-facing community content
- recommendations exist as a supported content type, but they are not as central in the current UX as favorites and lists

## Core Models

### `Favorite`

`Favorite` represents a user saving a company for themselves.

Important properties:

- belongs to one user
- belongs to one company
- unique per user/company pair
- ordered newest-first

Favorites are private.

### `CuratedList`

`CuratedList` is the core shareable community object.

Important properties:

- belongs to one user
- has a title and optional description
- has `is_public`
- is addressable by `id_hash`
- contains ordered items

Public lists are the main user-facing sharing artifact in the current app.

### `CuratedListItem`

`CuratedListItem` represents a company saved into a list with:

- a parent list
- a company
- an optional note
- a `position`

The item order is part of the product experience and is maintained in the backend.

### `Recommendation`

`Recommendation` is a user-authored piece of company-specific written content.

Important properties:

- belongs to one user
- belongs to one company
- has `title`
- has `body`
- has `is_public`

Recommendations are fully implemented in the backend and typed in the frontend, but they are not currently as integrated into the main dashboard and public-profile UI as lists are.

## Ownership And Access Rules

The backend is the source of truth for community permissions.

Current rules include:

- authenticated access is required for private favorites, private lists, owned list items, and owned recommendations
- public list detail is available without auth only when `is_public=True`
- public recommendations are available without auth through the API
- owner-only private list access by `id_hash` requires authentication as the owner
- `can_use_community_features` gates community access at the API level

### Current account-based behavior

From the current code and tests:

- personal users can create favorites, lists, and public recommendations
- pending business users can create favorites
- pending business users can create private lists
- pending business users cannot create public lists
- pending business users cannot create public recommendations
- verified business users can use community tools and can publicly share where allowed

This is an important distinction: community participation is broader than public publishing.

## Backend API Surface

Community endpoints are defined in [`../../community/urls.py`](../../community/urls.py).

Current routes include:

- `GET/POST /api/community/favorites/`
- `DELETE /api/community/favorites/<pk>/`
- `GET/POST /api/community/lists/`
- `GET/PATCH/DELETE /api/community/lists/<pk>/`
- `GET /api/community/lists/by-id-hash/<id_hash>/`
- `POST /api/community/lists/<pk>/items/`
- `GET/PATCH/DELETE /api/community/lists/items/<pk>/`
- `GET /api/community/public-lists/<id_hash>/`
- `GET/POST /api/community/recommendations/`
- `GET/PATCH/DELETE /api/community/recommendations/<pk>/`
- `GET /api/community/public-recommendations/`

## Serializer And Payload Design

### Favorites

Favorites serialize the related company using the compact `CompanyListSerializer` shape.

This makes favorites suitable for dashboard display and quick linking without needing full detail payloads.

### Lists

Private and public list serializers expose:

- list metadata
- ordered items
- each item’s company in compact company-list shape

Public lists additionally expose an `owner` object containing:

- `display_name`
- `public_slug`
- `account_type`

### Recommendations

Recommendations also serialize the related company in compact list shape.

The public recommendation serializer is simpler than the owned recommendation serializer and omits write-only concerns.

## Favorites Flow

Favorites are the lightweight “save this place” action in the app.

### Current frontend usage

The main save interaction lives in [`../../frontend/components/company-save-flow.tsx`](../../frontend/components/company-save-flow.tsx).

Current behavior:

- when authenticated, the component loads both favorites and lists
- a user can toggle a favorite on a company detail page
- after a company is favorited, the UI prompts the user to add it to a list

This makes favorites both:

- a private saved state
- a gateway into richer list curation

### Duplicate favorite behavior

Duplicate favorite creation is intentionally idempotent in the serializer layer: creating the same favorite again returns the existing record instead of creating a second one.

## Curated Lists

Curated lists are currently the main structured community object.

### Creation

Lists can be created from:

- dashboard modals
- company save flows
- add-to-list flows

The main list-creation UI lives in [`../../frontend/components/create-list-modal.tsx`](../../frontend/components/create-list-modal.tsx).

Current behavior:

- lists can have a title, short description, and privacy state
- description length is capped client-side
- unverified business users are prevented from creating public lists

### Editing

List editing is handled in [`../../frontend/components/edit-list-modal.tsx`](../../frontend/components/edit-list-modal.tsx).

Current capabilities:

- rename list
- edit description
- toggle privacy where allowed
- remove saved businesses from the list

### Item ordering

Item ordering is maintained in the backend:

- new items default to the end if no position is supplied
- inserting at a position shifts later items down
- deleting an item collapses positions behind it
- patching an item’s position reorders siblings transactionally

These rules live in the serializer layer and are covered by tests.

## Dashboard List Management

Dashboard list display is intentionally lightweight.

The current list rail in [`../../frontend/components/list-manager.tsx`](../../frontend/components/list-manager.tsx):

- shows each list as a chip-like link
- opens shared list pages in a new tab
- highlights item counts
- delegates creation to a modal

This is not a full in-dashboard editor; the deeper editing surface lives on the list page itself.

## Public List Pages

The public and owner-access list page is implemented in [`../../frontend/app/lists/[idHash]/page.tsx`](../../frontend/app/lists/%5BidHash%5D/page.tsx).

### Loading strategy

The route tries to load data in this order:

1. public list endpoint
2. if that fails and the viewer is authenticated, owner-only list-by-hash endpoint

This allows one route to support both:

- fully public list sharing
- owner access to private lists

### Page behavior

Current behavior includes:

- selecting a list item from the middle column
- fetching the selected company’s full detail payload
- rendering company metadata, links, map, and saved note
- share actions via Web Share API or clipboard fallback
- owner-only list editing and deletion affordances

This page is effectively a shared “list as browsing workspace” surface, not just a static document.

## Public Profiles

Public profile routing is implemented in [`../../frontend/app/profiles/[publicSlug]/page.tsx`](../../frontend/app/profiles/%5BpublicSlug%5D/page.tsx), and the main browser UI lives in [`../../frontend/components/public-profile-browser.tsx`](../../frontend/components/public-profile-browser.tsx).

### Visibility rules

The backend will surface a public profile if a user has at least one of:

- a public personal profile
- a public list
- a public recommendation

This is enforced in the queryset for `PublicProfileDetailView`.

### Current UI focus

Although the API returns both public lists and public recommendations, the current public-profile browser focuses on:

- profile hero information
- public lists
- selected businesses within a chosen list
- full company detail preview for the chosen business

Public recommendations are present in the payload, but they are not currently the center of the rendered browsing UI.

That distinction matters when making product or documentation claims about what public profiles “show.”

## Recommendations

Recommendations are a supported data type with backend CRUD and frontend components, but they currently sit in a secondary position compared with lists.

### What is implemented

- recommendation model and API
- create/update/delete frontend API wrappers
- typed recommendation interfaces
- a dedicated `RecommendationManager` component
- public recommendation exposure in profile payloads
- backend tests for creation and update

### What is not strongly integrated today

- the current main dashboard pages do not render `RecommendationManager`
- the current public-profile browser does not foreground public recommendations in the main browsing layout

So recommendations should currently be treated as:

- implemented capability
- not primary product surface

## Sharing Model

The app currently supports sharing in two main ways.

### 1. Public list pages

Each public list gets a stable route via `id_hash`.

This is the most explicit sharing artifact in the current product.

### 2. Public profile pages

Users with public-facing content can have a public profile page via `public_slug`.

In practice, lists are the main driver of shareable public identity right now.

## Current Frontend Type Contracts

The key TypeScript contracts live in:

- [`../../frontend/types/community.ts`](../../frontend/types/community.ts)
- [`../../frontend/types/profile.ts`](../../frontend/types/profile.ts)
- [`../../frontend/types/recommendation.ts`](../../frontend/types/recommendation.ts)

Important contracts include:

- `Favorite`
- `CuratedList`
- `CuratedListItem`
- `PublicCuratedList`
- `PublicProfile`
- `Recommendation`

Any serializer or response-shape change here should be paired with frontend type updates.

## Testing Coverage

The most relevant backend coverage for this area lives in:

- [`../../community/tests.py`](../../community/tests.py)
- [`../../users/tests.py`](../../users/tests.py)
- [`../../tests/test_api_shapes.py`](../../tests/test_api_shapes.py)

Current tested behaviors include:

- favorite creation and duplicate handling
- pending and verified business favorite permissions
- list creation and item creation
- pending business restriction on public lists
- owner-only protection on private lists and list items
- public list visibility rules
- recommendation creation and update behavior
- pending business restriction on public recommendations
- public profile exposure of public lists and public recommendations

## Extension Guidance

### If you add new list behavior

- decide whether it belongs in the list object, list-item object, or public-list presentation layer
- keep ordering rules in the backend
- update both owner and public list experiences if the shared payload changes

### If you expand recommendations

- first decide whether recommendations are becoming a first-class UX surface again
- if yes, update both dashboard rendering and public-profile rendering, not just the API
- document the shift clearly, since the current repo state treats recommendations as secondary

### If you change sharing rules

- update serializer validation and view permissions
- update tests in `community/tests.py`
- update account/dashboard docs as needed, since some sharing permissions depend on verification state

## Open Questions

- Should recommendations become a first-class public-profile surface again, or remain secondary to lists?
- Should public profiles differentiate more strongly between personal curators and businesses?
- Should list sharing remain centered on `id_hash` pages, or eventually support richer metadata or preview cards for external sharing?
- Should favorites remain entirely private, or should the product eventually support lightweight public “saved” collections distinct from lists?
