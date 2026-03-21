# Discovery And Company Profiles

## Why This Doc Exists

This doc covers the public discovery surface of FOUND: how people browse companies, how filters work, how a selected company is previewed, and how the full public company page is rendered.

It also covers the overlap point where public company profiles become editable by verified business owners.

## Feature Scope

This area includes:

- the home page’s company discovery framing
- the `/companies` directory experience
- taxonomy-backed filtering
- selected-company preview behavior inside the directory
- full public company profile pages
- community-submitted listings and provenance badges
- save/favorite affordances on company detail pages
- verified owner editing on the company detail page

It does not include:

- dashboard list management as a whole
- business claim submission and review workflow
- public profiles and public curated lists

Those are documented separately.

## Source Of Truth

Primary backend files:

- [`../../companies/models.py`](../../companies/models.py)
- [`../../companies/filters.py`](../../companies/filters.py)
- [`../../companies/serializers.py`](../../companies/serializers.py)
- [`../../companies/views.py`](../../companies/views.py)
- [`../../companies/cities.py`](../../companies/cities.py)

Primary frontend files:

- [`../../frontend/app/page.tsx`](../../frontend/app/page.tsx)
- [`../../frontend/app/companies/page.tsx`](../../frontend/app/companies/page.tsx)
- [`../../frontend/app/companies/[slug]/page.tsx`](../../frontend/app/companies/%5Bslug%5D/page.tsx)
- [`../../frontend/components/company-directory.tsx`](../../frontend/components/company-directory.tsx)
- [`../../frontend/components/company-save-flow.tsx`](../../frontend/components/company-save-flow.tsx)
- [`../../frontend/components/company-owner-editor.tsx`](../../frontend/components/company-owner-editor.tsx)
- [`../../frontend/lib/company-copy.ts`](../../frontend/lib/company-copy.ts)
- [`../../frontend/types/company.ts`](../../frontend/types/company.ts)

## Product Goal

The discovery experience is designed to help users find independent businesses through a tight, editorial-feeling browse flow rather than an infinite marketplace search experience.

That shows up in a few current product choices:

- the home page curates a small featured set instead of exposing raw search immediately
- the directory is filter-first
- the unfiltered directory intentionally starts empty
- the company detail page is the canonical public representation of a business
- the company detail page now pairs the location card with a Business Hours card

## Core Domain Model

The central model is `Company` in [`../../companies/models.py`](../../companies/models.py).

Important public-facing fields include:

- identity: `id`, `id_hash`, `name`, `slug`
- listing provenance: `listing_origin`
- description and website
- location: `address`, `city`, `state`, `zip_code`, `country`
- business hours: `business_hours`, `business_hours_timezone`
- category and taxonomy relationships
- social links
- boolean feature flags such as vegan-friendly and gluten-free-friendly

Supporting taxonomy models include:

- `BusinessCategory`
- `ProductCategory`
- `CuisineType`
- `OwnershipMarker`
- `SustainabilityMarker`

These taxonomy models shape both filtering and presentation.

## Public Backend Endpoints

The public discovery API currently exposes:

- `GET /api/companies/`
- `GET /api/companies/<slug>/`
- `POST /api/companies/community-listings/` for authenticated personal users
- `GET /api/business-categories/`
- `GET /api/product-categories/`
- `GET /api/cuisine-types/`
- `GET /api/ownership-markers/`
- `GET /api/sustainability-markers/`
- `GET /api/cities/`

All of these are public endpoints.

Important current creation rules:

- new company creation requires a website across community and owner-create flows
- company records are location-first, so multi-location businesses use separate company pages per storefront
- same-name businesses are allowed when they are clearly distinct listings
- the API blocks exact duplicates by shared hostname plus matching address or by matching `name + city + state + address`
- reusing an existing website for another location requires a street address on the new listing
- same-name, same-city submissions with different website or address are allowed but flagged for editorial review unless a verified owner is explicitly adding another managed location

## API Payload Shapes

This feature uses three distinct company payload shapes on purpose.

### 1. Directory list shape

The directory consumes the `CompanyListSerializer` shape:

- `business_category` is a string or `null`
- taxonomy arrays are string arrays
- the payload is relatively compact for browse views

This keeps the list surface lightweight and easy to render.

### 2. Company detail shape

The company detail page consumes the `CompanyDetailSerializer` shape:

- `business_category` is a nested taxonomy object
- taxonomy arrays are nested taxonomy objects
- provenance fields include `listing_origin` and `is_community_listed`
- `business_hours` is a canonical JSON object with `open_by_week` and `open_by_date`
- `business_hours_timezone` is the IANA timezone used to interpret those hours
- `other_locations` lists published sibling storefronts from the same `CompanyGroup`
- `public_recommendations` contains recommendation content for this exact location only
- timestamps are present
- richer location and social fields are included

This shape is designed for presentation depth rather than list efficiency.

### 3. Owner management shape

The verified owner editor uses `ManagedBusinessCompanySerializer`:

- taxonomy relationships are read and written as primary key IDs
- business hours are edited as a full validated JSON object rather than a free-text field
- the payload is designed for form editing, not public display

Do not assume these three representations should be unified unless the underlying UX also changes.

## Directory Route

The directory route is implemented in [`../../frontend/app/companies/page.tsx`](../../frontend/app/companies/page.tsx).

Important current behavior:

- taxonomy option lists are always fetched
- company results are only fetched when filters are active
- a selected company is fetched separately if the `selected` query param is present
- the page is marked `force-dynamic`

That means the directory is intentionally not a default "show me everything" index right now.

## Directory Query Params

The normalized frontend query shape lives in [`../../frontend/types/company.ts`](../../frontend/types/company.ts).

Current supported params include:

- `search`
- `city`
- `state`
- `country`
- `business_category`
- `product_categories`
- `ownership_markers`
- `sustainability_markers`
- `is_vegan_friendly`
- `is_gf_friendly`
- `ordering`
- `selected`

Important notes:

- `selected` is frontend state for the right-side preview panel, not a backend filter
- `ownership_markers`, `product_categories`, and `sustainability_markers` are comma-separated values
- `ordering` is normalized in the route layer but is not currently surfaced as a prominent UI control in the directory component

## Filter Semantics

Filtering is implemented in [`../../companies/filters.py`](../../companies/filters.py).

### Current filter behaviors

- city uses a custom method rather than a raw exact match
- state and country use case-insensitive exact matching
- `business_category` filters on the related category name
- multi-value taxonomy filters use `BaseInFilter`
- vegan-friendly and gluten-free-friendly use boolean filters
- founded year and employee count range filters exist in the backend even though the current UI does not expose them

### City canonicalization

City handling is special and worth preserving.

The helper in [`../../companies/cities.py`](../../companies/cities.py) maps aliases into canonical city buckets. Current examples include:

- `Gresham` -> `Portland`
- `Brooklyn` -> `New York`
- `West Hollywood` -> `Los Angeles`

This affects two things:

- the cities endpoint returns canonical city choices
- filtering by a canonical city includes its configured aliases

Tests in [`../../companies/tests/test_api.py`](../../companies/tests/test_api.py) cover these behaviors and should be updated if alias rules change.

## Directory UI Behavior

The main interactive directory UI lives in [`../../frontend/components/company-directory.tsx`](../../frontend/components/company-directory.tsx).

It has a three-panel structure:

- filters
- list of matching businesses
- selected business preview

### Important interaction rules

- changing most filters immediately updates the URL and reruns the route
- search is handled separately from the rest of the filter form
- the reset button returns the user to `/companies`
- when no filters are active, the list panel shows a "Start with filters" empty state
- when filters are active but nothing matches, the list panel shows a "No matches" empty state

### Selected business flow

The directory does not embed full detail data for every list item.

Instead:

- the list contains compact company rows
- clicking a row sets `selected=<slug>` in the URL
- the route fetches that single company through the detail endpoint
- the right-side preview panel renders the selected company

This keeps the list lightweight while still allowing a richer browse-with-preview experience.

### Mobile behavior

The component has explicit mobile panel toggles and collapsible sections for:

- filters
- finds list
- selected company preview

It also synchronizes panel heights on larger breakpoints to preserve the multi-column layout.

## Home Page Discovery Behavior

The home page in [`../../frontend/app/page.tsx`](../../frontend/app/page.tsx) uses directory data differently than `/companies`.

Current behavior:

- fetch a broad list of companies
- score and select a diverse featured subset
- fetch detail pages for preview candidates
- fall back to hard-coded featured examples if API data is missing or weak

This is intentionally a curated landing surface, not just a mirror of the directory route.

## Company Detail Page

The full public company page is implemented in [`../../frontend/app/companies/[slug]/page.tsx`](../../frontend/app/companies/%5Bslug%5D/page.tsx).

It is the canonical public business profile in the app.

Current public badge behavior:

- community-submitted listings show `Community Listed` while no verified owner claim exists
- once a verified business claim is attached, the listing remains community-origin in data but the public badge is removed

### Current responsibilities

- fetch company detail by slug
- generate route metadata
- emit organization structured data
- preserve back-navigation context to the filtered directory
- render location, social, taxonomy, and descriptive sections
- include save/favorite controls
- include verified owner editing tools when allowed

### Content shaping

The detail page uses helpers from [`../../frontend/lib/company-copy.ts`](../../frontend/lib/company-copy.ts) to normalize description copy.

Current fallback behavior:

- if a company description exists, it is cleaned and punctuation-normalized
- if not, fallback copy is derived from the business category

This same pattern exists for both list and detail contexts.

### Detail-route query behavior

The detail page preserves incoming filter query params so users can move back to the directory without losing browse context.

It also supports `?edit=1`, which is used as a verified-owner entry point.

## Save And Favorite Flow

The save tools on the company detail page live in [`../../frontend/components/company-save-flow.tsx`](../../frontend/components/company-save-flow.tsx).

Current behavior:

- loads the user’s favorites and lists when authenticated
- lets the user toggle the company as a favorite
- prompts the user to add the company to a list after favoriting
- can create a new list inline
- blocks all of this behind authenticated client-side state

Current product rules embedded here:

- personal users can use save tools
- business users can also use save tools
- public list creation is limited by account state, with unverified business users restricted from public sharing

## Verified Owner Editing On The Public Profile

The owner editor lives in [`../../frontend/components/company-owner-editor.tsx`](../../frontend/components/company-owner-editor.tsx).

This is a key architectural decision: verified business editing happens on the real public company page rather than on a separate admin-like edit surface.

### Current gating logic

The editor only appears when:

- auth is ready
- the user is authenticated
- the user is a verified business user
- the managed business profile returned by the API matches the current company slug

### Edit mode behavior

- the editor lazily loads taxonomy options
- `?edit=1` can auto-open edit mode
- updates are sent through the managed business profile endpoint
- after save, the route refreshes so the public page reflects the updated company data

This means the company detail page serves both as:

- the public presentation layer
- the verified business owner editing surface

## SEO And Metadata

Discovery routes currently include explicit metadata behavior:

- `/companies` changes title and robots behavior based on whether filters are active
- filtered directory pages are marked `index: false`
- company detail pages set canonical URLs
- company detail pages emit Open Graph metadata
- the detail route emits `schema.org` organization structured data

Any major change to public routing or data loading should preserve this behavior unless there is a deliberate SEO strategy change.

## Testing Coverage

The most relevant backend coverage for this feature lives in:

- [`../../companies/tests/test_api.py`](../../companies/tests/test_api.py)
- [`../../companies/tests/test_models.py`](../../companies/tests/test_models.py)
- [`../../tests/test_api_shapes.py`](../../tests/test_api_shapes.py)

Current covered behaviors include:

- public accessibility of list and detail endpoints
- location-aware slug generation
- taxonomy endpoint exposure
- city canonicalization and alias behavior
- same-name business duplicate handling and editorial-review rules
- filter behavior for category, ownership, multi-value taxonomy, search, and range filters
- exact response shape expectations for list and detail payloads

## Extension Guidance

### If you want to add a new filter

- add it in [`../../companies/filters.py`](../../companies/filters.py)
- extend the normalized search-param shape in [`../../frontend/types/company.ts`](../../frontend/types/company.ts) if needed
- add the UI control in [`../../frontend/components/company-directory.tsx`](../../frontend/components/company-directory.tsx)
- add API and shape tests

### If you want to add a new public company field

- decide whether it belongs in list shape, detail shape, management shape, or some combination
- update serializers intentionally rather than copying the field into every response by default
- update typed frontend contracts and tests together

### If you want to change owner editing

- treat the company detail page as the primary surface unless product direction explicitly changes
- coordinate changes with the business-claims-and-owner-tools doc, since the verified owner path depends on both areas

## Open Questions

- Should the unfiltered directory eventually show a default result set instead of a filter-first empty state?
- Should backend-only filters like employee ranges eventually become part of the public UI?
- Should company descriptions remain simple editorial copy, or evolve into richer structured profile content?
- Should the selected-company preview remain a directory-side panel long term, or eventually give way to a simpler list-to-detail flow on more breakpoints?
