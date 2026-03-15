# Business Claims And Owner Tools

## Status

This feature is still under active development.

Treat this page as a stub and orientation note, not a settled implementation spec.

## Current Scope

This area currently covers:

- business account onboarding after signup
- business claim submission
- pending versus verified business state
- create-or-edit business profile routing
- owner editing from the public company page

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

## Source Of Truth

- claim model and business verification state:
  - [`../../users/models.py`](../../users/models.py)
  - [`../../users/serializers.py`](../../users/serializers.py)
  - [`../../users/views.py`](../../users/views.py)
- managed business profile flow:
  - [`../../companies/views.py`](../../companies/views.py)
  - [`../../companies/serializers.py`](../../companies/serializers.py)
- current frontend flow:
  - [`../../frontend/app/business/claim/page.tsx`](../../frontend/app/business/claim/page.tsx)
  - [`../../frontend/app/business/company/page.tsx`](../../frontend/app/business/company/page.tsx)
  - [`../../frontend/components/company-profile-creation-form.tsx`](../../frontend/components/company-profile-creation-form.tsx)
  - [`../../frontend/components/company-owner-editor.tsx`](../../frontend/components/company-owner-editor.tsx)

## Current Known Rules

- business claims are reviewed manually
- verified claims unlock business profile creation or editing
- a verified user with no linked company can create one through `/business/company`
- a verified user with a linked company is redirected into that company’s public page with `?edit=1`
- owner editing currently depends on fetching the managed business profile and matching its slug to the current company detail route
- the business user edits the actual company record that powers the public page

## Current Flow Snapshot

What seems true in the code today:

- business users sign up, then go through `/business/claim`
- the claim page collects business/contact details and routes the user to the pending dashboard
- pending business users can still use parts of the dashboard and community experience while waiting
- verified business users use `/business/company` as a create-or-redirect entry point
- existing claimed businesses route into the public company page in edit mode

## Areas Still In Flux

- the exact admin review workflow
- how rejected claims should be surfaced in the frontend UX
- whether owner edits should publish immediately or go through review
- whether one business user will eventually manage multiple companies
- how much of business setup should live on `/business/company` versus the public company page

## Next Time We Flesh This Out

- document the admin-side review process and operational checklist
- map the exact state transitions for `pending`, `verified`, and `rejected`
- document the create-vs-edit branch end to end
- add a concise permissions matrix for pending vs verified business users

## Open Questions

- Should owner edits publish immediately forever, or eventually move to a review queue?
- How should multi-location or multi-brand businesses fit into the current single-managed-company path?
