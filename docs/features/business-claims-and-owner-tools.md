# Business Claims And Owner Tools

## Status

This feature now includes a real manual-review verification workflow for business accounts.

It is still evolving, but the claim lifecycle, dashboard states, and admin review path below reflect code that exists now.

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

- business claims are reviewed manually in Django admin
- claims carry an explicit intent: `existing` or `new`
- claim submissions store structured submitter identity fields plus business contact details
- rejected claims can be revised and resubmitted from the same claim record
- claim history is preserved as an event timeline
- verified claims unlock business profile creation or editing
- a verified user with no linked company can create one through `/business/company`
- a verified user with a linked company is redirected into that company’s public page with `?edit=1`
- owner editing currently depends on fetching the managed business profile and matching its slug to the current company detail route
- the business user edits the actual company record that powers the public page

## Current Flow Snapshot

What seems true in the code today:

- business users sign up, choose whether they are claiming an existing listing or adding a new business, then go through `/business/claim`
- existing-business claims now target a real FOUND company during submission
- the claim page supports both first-time submission and rejected-claim resubmission
- the pending dashboard shows current claim details, reviewer feedback, and next-step messaging
- pending business users can still use parts of the dashboard and community experience while waiting
- verified business users use `/business/company` as a create-or-redirect entry point
- existing claimed businesses route into the public company page in edit mode

## Areas Still In Flux

- whether business verification should eventually support uploads or stronger proof collection
- whether one business user will eventually manage multiple companies
- how much of business setup should live on `/business/company` versus the public company page
- whether owner edits should ever move from immediate publish to a review queue

## Admin Review Snapshot

- reviewers open claims in Django admin
- they choose `verified` or `rejected`
- review decisions require at least one checklist item
- rejected decisions also require a primary reason code
- saving a decision stamps reviewer metadata, appends a history event, and sends an email notification to the business contact

## Next Time We Flesh This Out

- document the full reviewer operating checklist with screenshots
- add a concise permissions matrix for pending vs verified business users
- document the notification templates and operational email setup for production

## Open Questions

- Should owner edits publish immediately forever, or eventually move to a review queue?
- How should multi-location or multi-brand businesses fit into the current single-managed-company path?
