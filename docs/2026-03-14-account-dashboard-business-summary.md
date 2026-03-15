# FOUND Account, Dashboard, and Business Rollout Summary

Date: March 14, 2026

## What was built

FOUND now has two non-admin account types:

- Personal
- Business

Personal users can:

- sign up and log in immediately
- favorite businesses
- create lists
- manage a public profile
- share public lists and a public profile page

Business users can:

- sign up and submit a business claim
- use a dashboard while pending verification
- favorite businesses and create private lists while pending
- unlock public sharing and business editing after verification

## Account and auth flow

Implemented across the Django API and Next.js frontend:

- account type selection at signup
- business-specific signup path
- password confirmation on signup
- password visibility toggle on signup and login
- richer auth/session handling so users are not logged out every few minutes
- public profile slug support for shareable curator pages

Important business rule:

- pending business users can curate privately
- only verified business users can make lists public or edit a business listing

## Dashboard direction

The personal dashboard was redesigned around three clear areas:

- favorites
- lists
- share/profile

Key product changes:

- favorites and lists are the center of the experience
- recommendations were removed from the dashboard
- list management moved toward sharing, not in-dashboard clutter
- the share/profile card now focuses on name, bio, public toggle, save, and profile CTA
- logout is a full-width strip action

The verified business dashboard now mirrors the personal dashboard, with a single business CTA strip above the three columns.

That CTA changes by state:

- `CLAIM MY BUSINESS`
- `PENDING VERIFICATION`
- `EDIT MY BUSINESS`

## Community features

Implemented community features include:

- favorites
- curated lists
- list items
- public list pages
- public curator profiles

Refinements completed:

- add-to-list flows from company pages and favorites
- list creation and editing modals
- owner-only list edit/delete controls
- pending businesses cannot publish lists
- success feedback for favorites/list saves as toast-style confirmations

## Public profiles

Public profile work included:

- public profile route by slug
- public list aggregation
- dashboard-driven profile editing
- profile CTA visibility based on actual saved public state
- production fix for users missing a `PersonalProfile`

Follow-up production fix:

- personal profiles are now created automatically for personal users
- missing personal profiles are backfilled by migration

## Business claim and verification flow

Business onboarding was tightened into a clearer manual-review flow.

Current behavior:

- business users choose whether they are claiming an existing business or adding a new one
- signup carries that intent into the claim flow
- claim form is prefilled from signup/session data where possible
- claims are reviewed manually by admins

Current claim-page fields:

- business name
- first name
- last name
- job title
- business email
- business domain
- phone
- claim message

Important product clarification:

- the UI now reflects manual review, not email-based verification
- copy that suggested email verification was removed

## Business profile editing direction

We moved away from the idea of a partial “business editor” embedded in the dashboard.

Chosen direction:

- the business dashboard stays structurally similar to the personal dashboard
- business owners use a single CTA strip to move into business management
- existing claimed businesses should route to the real company profile page in edit mode
- verified new-business owners should route into company profile creation

This direction keeps the company profile page as the source of truth for business data.

## Styling and UX decisions

Across the app, we aligned more tightly with the FOUND visual language:

- flatter panels instead of ombre cards in most dashboard/editor surfaces
- tighter spacing based on the search page
- consistent header geometry across major views
- responsive dashboard behavior, including collapsible mobile sections
- more consistent section-header heights

Pages that received substantial visual cleanup:

- dashboard
- login
- signup
- company profile
- public profile
- business pending/dashboard
- business claim flow

## Production fixes handled during rollout

Notable production fixes included:

- public profile route resolving correctly for live users
- creation/backfill of missing `PersonalProfile` rows
- production slug update for the live profile
- frontend deployment needed in addition to backend deployment for profile routes

## Open product directions

These are the clearest next steps after this rollout:

- finish the verified business owner company-edit flow end-to-end
- ensure `EDIT MY BUSINESS` routes correctly for both existing-company claims and new-business claims
- refine the company owner editing UI on the real company profile page
- continue polishing the public profile page to match dashboard quality
- decide whether to add true automated business-email verification later
