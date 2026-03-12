# Found V1 Project Plan

## Summary
Found is a public, SEO-oriented company directory built as a Django API plus an SSR React frontend in the same repository. The backend owns the company and taxonomy domain, while the frontend renders public company list and detail pages that are indexable, fast, and shareable.

## Product Goals
- Publish a clean directory of companies across retail, food, wellness, and adjacent categories.
- Support rich filtering without making the browse experience feel heavy.
- Keep data modeling clean from the start by using audited first-party fields instead of imported CRM concerns.
- Prioritize SEO for public company pages and keep URL structure stable.

## Backend Data Model
### Core entities
- `BusinessCategory`
  - Controlled vocabulary for top-level business type, such as Retail, Food, or Wellness.
- `ProductCategory`
  - Controlled vocabulary for product-oriented tags, such as Clothing, Gifts, or Furniture.
- `SustainabilityMarker`
  - Controlled vocabulary for sustainability traits, such as Sustainable Products or Vintage Goods.
- `Company`
  - Built on `core.BaseModel`
  - Identity and display: `name`, `slug`, `description`, `website`
  - Location: `address`, `city`, `state`, `zip_code`, `country`
  - Business profile: `founded_year`, `annual_revenue`, `number_of_employees`
  - Social presence: `instagram_handle`, `facebook_page`, `linkedin_page`
  - Traits: `is_vegan_friendly`, `is_gf_friendly`
  - Taxonomies: `business_category`, `product_categories`, `sustainability_markers`

### Data model rules
- Exclude all HubSpot fields.
- Exclude the legacy flexible `CompanyAttribute` table from v1.
- Keep location directly on `Company`; do not normalize into `City` or `State` tables in v1.
- Use `slug` as the canonical public identifier for company pages.
- Keep company management admin-only in v1.

## API Contract
### Endpoints
- `GET /api/companies/`
  - Paginated company list.
- `GET /api/companies/<slug>/`
  - Company detail by slug.
- `GET /api/business-categories/`
- `GET /api/product-categories/`
- `GET /api/sustainability-markers/`

### Filtering and query params
- Text search: `search`
- Exact location filters: `city`, `state`, `country`
- Taxonomy filters:
  - `business_category`
  - `product_categories`
  - `sustainability_markers`
- Boolean filters:
  - `is_vegan_friendly`
  - `is_gf_friendly`
- Range filters:
  - `founded_year_min`, `founded_year_max`
  - `employees_min`, `employees_max`
- Ordering:
  - `ordering`

### Query conventions
- Multi-select filters use comma-separated values when calling the backend API.
- Company list uses page-number pagination.
- Company list payload is lighter than company detail payload.

## Frontend Architecture
### Runtime
- SSR-capable React app in `frontend/`.
- Public routes:
  - `/companies`
  - `/companies/[slug]`

### Rendering strategy
- Render list and detail pages server-side.
- Use query-string driven filters so browse state is shareable and reload-safe.
- Generate per-page metadata server-side.
- Keep filtered result pages shareable but mark them `noindex` to avoid index bloat.

### UI expectations
- Directory list page includes:
  - search
  - city
  - business category
  - product categories
  - sustainability markers
  - vegan-friendly and gluten-free-friendly toggles
  - sorting
- Company detail page includes:
  - descriptive header
  - taxonomy chips
  - location and links
  - structured data when enough audited fields exist

## SEO Rules
- Public company detail pages must render complete HTML on first response.
- Each detail page should have unique title and meta description.
- Each detail page should expose a canonical URL.
- Directory root pages may be indexed.
- Filtered list variants should be marked `noindex,follow` unless a future curated landing-page strategy is introduced.

## Implementation Phases
1. Finalize company schema and taxonomy set.
2. Build backend models, admin, migrations, and filtered read APIs.
3. Scaffold SSR frontend and render public company list and detail pages.
4. Add URL-driven filter UX, metadata, and canonical behavior.
5. Add any authenticated user features separately from the public directory.
6. Polish tests, deployment configuration, and documentation.

## Field Audit Items
- Confirm whether `annual_revenue` belongs in public company profiles or should remain internal/admin-only.
- Confirm whether `number_of_employees` should be exact, ranged, or hidden when unknown.
- Confirm whether `instagram_handle` should remain a handle or become a full profile URL.
- Confirm whether additional public social links are needed before broader data entry begins.
