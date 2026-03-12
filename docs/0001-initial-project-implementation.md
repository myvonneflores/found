# 0001 Initial Project Implementation

## Summary
This document captures the first substantial implementation pass for Found: the backend company-directory domain, the import and cleanup pipeline, and the public SSR frontend directory experience built during the initial implementation phase.

## Product Direction Established
- Found is a public-facing, SEO-oriented local-business directory.
- The product is positioned as an anti-Yelp alternative focused on small, community-rooted businesses rather than chains and big-box noise.
- The primary product surface is the directory itself.
- The current frontend visual language is based on Michelle's pastel mockups: green background, pink header, blue section bars, cream content panels, warm accent text, and Poppins typography.

## Backend Implementation

### Company Domain
Implemented a `companies` app with first-party directory models:
- `BusinessCategory`
- `ProductCategory`
- `SustainabilityMarker`
- `OwnershipMarker`
- `Company`

The company model supports:
- name and slug
- description and website
- address, city, state, zip code, country
- founded year
- social links and Instagram handle
- vegan-friendly and gluten-free-friendly flags
- business category
- product categories
- sustainability markers
- ownership markers

### API
Implemented DRF read endpoints for:
- company list
- company detail
- business categories
- ownership markers
- sustainability markers
- city options

Filtering supports:
- search
- city
- business category
- ownership markers
- sustainability markers
- vegan-friendly
- gluten-free-friendly

### Pagination
Added a custom pagination class to support larger directory result sets while keeping an API default page size.

## Data Import and Cleanup

### Import Command
Implemented a CSV-based import command for the company dataset.

The importer currently:
- normalizes business categories
- normalizes product categories
- imports ownership markers from `owner_demographics`
- imports sustainability markers
- normalizes social/profile URLs
- normalizes Instagram handles
- excludes known bad or intentionally removed records
- supports pruning unused taxonomy records

### City Normalization
Implemented city rollups so the UI can present major cities instead of fragmented sub-city options.

Current rollups include:
- `Gresham -> Portland`
- `Brooklyn -> New York`
- `Woodstock -> New York`
- `Long Beach -> Los Angeles`
- `Venice -> Los Angeles`
- `West Hollywood -> Los Angeles`

### Data Exclusions
The importer currently excludes:
- `Alien Mermaid Cove`
- `Revive Athletics`
- `Soren`
- `Soulful PDX`

## Frontend Implementation

### Framework
The frontend is implemented as a Next.js app with SSR-capable routes.

### Routes
Implemented routes for:
- `/companies`
- `/companies/[slug]`
- `/about`
- `/contact`

The root route currently redirects to `/companies`.

### Directory Page
The directory page is implemented as a three-panel experience:
- `filters`
- `finds`
- `find`

Implemented features include:
- header search
- branded single-select dropdowns
- branded multi-select dropdowns
- immediate filter updates
- internal panel scrolling for desktop
- selection state for the finds list
- responsive stacked mobile layout with panel-local headers

### Compact Business View
The right-hand selected-business panel currently includes:
- linked company name
- address block
- social icons
- map
- ownership and focus metadata
- product-category pills

This panel has been iterated heavily to match the provided design direction while staying functional with real imported data.

### Full Company Profile
The full profile page includes:
- branded header link back to the directory
- company hero card
- location map card
- socials card with branded icon links
- product category pills
- `Why We Love Them` sustainability section

The profile page color treatment was updated separately from the directory page to align with the provided mockup palette.

## Design and UX Decisions Established
- Use `Poppins` as the product font.
- Prefer intentional, branded controls over browser-default inputs.
- Keep filter interactions simple and immediate.
- Prefer user-facing editorial language over internal taxonomy language.
- Treat spacing, wrapping, and mobile behavior as first-class product concerns.

## Collaboration and Workflow Decisions
- Work directly on `main`.
- Do not optimize for branches or PRs.
- Commit more frequently as milestone checkpoints.
- Use the running app and screenshots as the primary review loop for UI refinement.

## Milestone Commits in This Phase
- `615b29b` Add company directory backend and SSR frontend scaffold
- `6a899e9` Add company import tooling and frontend dev setup
- `900f1c3` Audit company data and polish public profiles
- `76dfe92` Add editorial review workflow for company content
- `746e5b7` Refine Found directory experience

## Open Areas for Next Work
- continue tightening the compact business-card behavior under dense metadata
- keep improving mobile-specific layout behavior
- decide what the eventual `About` and `Contact` pages should become
- continue content cleanup as needed without blocking product/system work
