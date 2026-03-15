# Business Claims And Owner Tools

## Scope

This feature area covers:

- business account onboarding
- business claim submission and review state
- verified business dashboard routing
- creation of a company profile for newly verified businesses
- editing of an existing claimed company from the public detail page

## Current Entry Points

- Frontend routes:
  - [`../../frontend/app/business/claim/page.tsx`](../../frontend/app/business/claim/page.tsx)
  - [`../../frontend/app/business/pending/page.tsx`](../../frontend/app/business/pending/page.tsx)
  - [`../../frontend/app/business/dashboard/page.tsx`](../../frontend/app/business/dashboard/page.tsx)
  - [`../../frontend/app/business/company/page.tsx`](../../frontend/app/business/company/page.tsx)
  - [`../../frontend/app/companies/[slug]/page.tsx`](../../frontend/app/companies/%5Bslug%5D/page.tsx)
- Backend routes:
  - `GET/POST /api/users/business-claims/`
  - `GET/PATCH /api/users/business-claims/<pk>/`
  - `GET/POST/PATCH /api/companies/manage/current/`

## Backend Surface

- Claim model and account state live in [`../../users/models.py`](../../users/models.py).
- Claim APIs live in [`../../users/views.py`](../../users/views.py).
- Managed business profile APIs live in [`../../companies/views.py`](../../companies/views.py).

Important current rule:

- verified claims unlock business profile creation or editing
- the business user edits the actual company record that powers the public page

## Frontend Surface

- Claim submission UI: [`../../frontend/app/business/claim/page.tsx`](../../frontend/app/business/claim/page.tsx)
- New profile creation UI: [`../../frontend/components/company-profile-creation-form.tsx`](../../frontend/components/company-profile-creation-form.tsx)
- Existing profile edit UI: [`../../frontend/components/company-owner-editor.tsx`](../../frontend/components/company-owner-editor.tsx)

## Current Behavior Notes

- Business claims are reviewed manually.
- A verified user with no linked company can create one through `/business/company`.
- A verified user with a linked company is redirected into that company’s public page with `?edit=1`.
- Owner editing currently depends on fetching the managed company profile and matching its slug to the company detail route.

## Good Next Expansions

- document the admin-side review flow and operational checklist
- define how owner edits should interact with editorial review or moderation
- clarify whether a business user may manage multiple companies in the near-term product model

## Open Questions

- Should owner edits publish immediately forever, or eventually move to a review queue?
- How should multi-location or multi-brand businesses fit into the current single-managed-company path?
