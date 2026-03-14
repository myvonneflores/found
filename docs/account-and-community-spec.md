# FOUND account and community spec

## Goal

Introduce two non-admin account types for FOUND:

- Personal
- Business

Personal users can sign up and use FOUND community features immediately.

Business users can sign up, submit a business claim, and access a limited pending dashboard while awaiting verification. Only verified business users can manage public business listings.

This spec is designed to fit the current Django API and Next.js frontend in this repository.

## Product rules

### Account types

- Admin
  - Existing Django staff and superusers
  - Unchanged by this feature
- Personal
  - Can log in immediately
  - Can create a profile
  - Can create favorites
  - Can create lists
  - Can publish recommendations
- Business
  - Can register immediately
  - Can log in to a limited pending dashboard
  - Must be verified before managing a public company listing
  - Can create favorites, lists, and recommendations once verified

### Verification rules

- A business account is not considered verified until at least one linked business claim is approved.
- A business user with only pending or rejected claims cannot edit a company listing.
- A business user can resubmit after rejection.
- Admin approval is required before public business-management tools are enabled.

## Domain model

## users.User

Current model: [users/models.py](/Users/michelleflores/code/found/users/models.py)

Add the following fields:

| Field | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `account_type` | `CharField` | yes | `personal` | choices: `personal`, `business` |
| `display_name` | `CharField(120)` | no | blank | personal-facing display label |
| `onboarding_completed` | `BooleanField` | yes | `False` | set once account setup is complete |

Suggested enum:

```python
class AccountType(models.TextChoices):
    PERSONAL = "personal", "Personal"
    BUSINESS = "business", "Business"
```

Notes:

- Keep auth identity on `User`.
- Do not store business verification state directly on `User` if a user may later claim multiple companies.
- Derive `is_business_verified` from approved claims.

## users.PersonalProfile

New model.

Purpose:

- Stores personal profile metadata without bloating the auth model.

Fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `user` | `OneToOneField(User)` | yes | cascade delete |
| `bio` | `TextField` | no | short public description |
| `avatar_url` | `URLField` | no | can move to image upload later |
| `location` | `CharField(120)` | no | optional city/region |
| `is_public` | `BooleanField` | yes | default `False` |

Rules:

- Only personal users should own a `PersonalProfile`.
- Profile defaults to private.

## users.BusinessClaim

New model.

Purpose:

- Represents a business ownership claim and review workflow.
- Connects business users to `companies.Company`.

Fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `user` | `ForeignKey(User)` | yes | business user who submitted claim |
| `company` | `ForeignKey(Company)` | no | nullable if creating a new listing request |
| `status` | `CharField` | yes | `pending`, `verified`, `rejected` |
| `business_name` | `CharField(255)` | yes | submitted business name |
| `business_email` | `EmailField` | yes | verification contact |
| `business_phone` | `CharField(50)` | no | optional |
| `website` | `URLField` | no | should usually align with company website |
| `instagram_handle` | `CharField(100)` | no | optional |
| `facebook_page` | `URLField` | no | optional |
| `linkedin_page` | `URLField` | no | optional |
| `role_title` | `CharField(120)` | no | owner, manager, marketer, etc. |
| `claim_message` | `TextField` | no | explanation of relationship to business |
| `submitted_at` | `DateTimeField` | yes | auto now add |
| `reviewed_at` | `DateTimeField` | no | null until reviewed |
| `reviewed_by` | `ForeignKey(User)` | no | admin reviewer |
| `review_notes` | `TextField` | no | internal notes or rejection reason |

Suggested enum:

```python
class VerificationStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    VERIFIED = "verified", "Verified"
    REJECTED = "rejected", "Rejected"
```

Constraints:

- A claim owner must have `account_type=business`.
- Only one `verified` claim per user-company pair.
- Prefer unique constraint on active duplicate claims per user-company when practical.

Derived properties:

- `user.is_business_verified` if any related claim has `status=verified`
- `user.primary_business_claim` can be chosen later if needed

## companies.Company

Current model: [companies/models.py](/Users/michelleflores/code/found/companies/models.py)

MVP recommendation: keep the main model stable and expose only a business-editable subset through a dedicated serializer.

Optional additions for MVP:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `hours_text` | `TextField` | no | lightweight business hours entry |
| `claimed_at` | `DateTimeField` | no | first verified claim timestamp |

Optional later additions:

- normalized `BusinessHour` model
- `is_claimed` computed or stored flag
- editorial review workflow for business-submitted edits

### Business-editable company fields

Verified business users may edit:

- `description`
- `website`
- `business_category`
- `instagram_handle`
- `facebook_page`
- `linkedin_page`
- `address`
- `city`
- `state`
- `zip_code`
- `country`
- `hours_text`
- `product_categories`
- `cuisine_types`

Not business-editable in MVP:

- `needs_editorial_review`
- `annual_revenue`
- `number_of_employees`
- internal import or quality-control fields
- future editorial flags

## community models

Recommend a new `community` app for these. If you want a smaller initial change set, these can temporarily live in `users`.

## community.Favorite

Fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `user` | `ForeignKey(User)` | yes | owner |
| `company` | `ForeignKey(Company)` | yes | favorited business |
| `created_at` | `DateTimeField` | yes | auto now add |

Constraint:

- unique pair on `user`, `company`

## community.List

Fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `user` | `ForeignKey(User)` | yes | owner |
| `title` | `CharField(120)` | yes | list title |
| `description` | `TextField` | no | optional intro |
| `is_public` | `BooleanField` | yes | default `False` |
| `created_at` | `DateTimeField` | yes | auto now add |
| `updated_at` | `DateTimeField` | yes | auto now |

Rules:

- Both personal and verified business accounts can create lists.
- Pending business users should not create public business-curated lists yet.

## community.ListItem

Fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `list` | `ForeignKey(List)` | yes | parent list |
| `company` | `ForeignKey(Company)` | yes | listed business |
| `note` | `TextField` | no | optional commentary |
| `position` | `PositiveIntegerField` | yes | ordering |
| `created_at` | `DateTimeField` | yes | auto now add |

Constraint:

- unique pair on `list`, `company`

## community.Recommendation

Fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `user` | `ForeignKey(User)` | yes | author |
| `company` | `ForeignKey(Company)` | yes | recommended business |
| `title` | `CharField(140)` | yes | short recommendation title |
| `body` | `TextField` | yes | recommendation content |
| `is_public` | `BooleanField` | yes | default `True` |
| `created_at` | `DateTimeField` | yes | auto now add |
| `updated_at` | `DateTimeField` | yes | auto now |

Display rule:

- Label recommendation authors differently based on `user.account_type`.
- Business recommendations should display as business-curated.

## API contract

Base path follows existing API structure under `/api/`.

## Auth endpoints

### `POST /api/users/register/`

Creates a user account.

Request body:

```json
{
  "email": "owner@example.com",
  "password": "strong-password",
  "first_name": "Riley",
  "last_name": "Nguyen",
  "display_name": "Riley",
  "account_type": "business"
}
```

Validation:

- `email` unique
- `password` minimum 8 characters
- `account_type` must be `personal` or `business`

Response `201`:

```json
{
  "id": "user_id",
  "email": "owner@example.com",
  "first_name": "Riley",
  "last_name": "Nguyen",
  "display_name": "Riley",
  "account_type": "business",
  "onboarding_completed": false
}
```

### `POST /api/auth/token/`

Custom token endpoint replacing the default SimpleJWT token view in [config/api_urls.py](/Users/michelleflores/code/found/config/api_urls.py).

Request body:

```json
{
  "email": "owner@example.com",
  "password": "strong-password"
}
```

Response `200`:

```json
{
  "refresh": "jwt-refresh-token",
  "access": "jwt-access-token",
  "user": {
    "id": "user_id",
    "email": "owner@example.com",
    "first_name": "Riley",
    "last_name": "Nguyen",
    "display_name": "Riley",
    "account_type": "business",
    "is_business_verified": false,
    "verification_status": "pending"
  }
}
```

Behavior:

- Personal users: normal login
- Business users with pending claims: allowed login, limited product access
- Business users with rejected claims: allowed login, can resubmit
- Business users with verified claims: full business access

Strict variant if desired:

- Return `403` for business users without a verified claim

Recommended error body for strict variant:

```json
{
  "detail": "Your business account is pending verification."
}
```

### `GET /api/users/me/`

Returns current user and derived status.

Response `200`:

```json
{
  "id": "user_id",
  "email": "owner@example.com",
  "first_name": "Riley",
  "last_name": "Nguyen",
  "display_name": "Riley",
  "account_type": "business",
  "onboarding_completed": true,
  "is_business_verified": false,
  "verification_status": "pending"
}
```

### `PATCH /api/users/me/`

Editable fields:

- `first_name`
- `last_name`
- `display_name`
- `onboarding_completed`

`account_type` should be immutable after creation in MVP.

## Personal profile endpoints

### `GET /api/users/me/profile/`

Returns the current user’s personal profile.

Only valid for personal users.

### `PATCH /api/users/me/profile/`

Request body:

```json
{
  "bio": "Finding the best local bookstores and coffee spots.",
  "avatar_url": "https://example.com/avatar.jpg",
  "location": "Los Angeles, CA",
  "is_public": true
}
```

Permission:

- `account_type=personal`

## Business claim endpoints

### `POST /api/users/business-claims/`

Creates a new business verification request.

Request body for claiming an existing listing:

```json
{
  "company": "company_id",
  "business_name": "Sunbeam Books",
  "business_email": "hello@sunbeambooks.com",
  "business_phone": "555-555-5555",
  "website": "https://sunbeambooks.com",
  "instagram_handle": "sunbeambooks",
  "role_title": "Owner",
  "claim_message": "I own this business and would like to manage the profile."
}
```

Request body for requesting a new listing:

```json
{
  "business_name": "Sunbeam Books",
  "business_email": "hello@sunbeambooks.com",
  "website": "https://sunbeambooks.com",
  "role_title": "Owner",
  "claim_message": "We are not listed yet and would like to create a profile."
}
```

Response `201`:

```json
{
  "id": "claim_id",
  "company": "company_id",
  "status": "pending",
  "business_name": "Sunbeam Books",
  "business_email": "hello@sunbeambooks.com",
  "submitted_at": "2026-03-13T00:00:00Z"
}
```

Permission:

- `account_type=business`

### `GET /api/users/business-claims/me/`

Returns current user’s claims, most recent first.

Response `200`:

```json
[
  {
    "id": "claim_id",
    "company": "company_id",
    "company_name": "Sunbeam Books",
    "status": "pending",
    "review_notes": "",
    "submitted_at": "2026-03-13T00:00:00Z",
    "reviewed_at": null
  }
]
```

### `PATCH /api/users/business-claims/<id>/`

Editable only when `status` is `pending` or `rejected`.

Editable fields:

- `business_name`
- `business_email`
- `business_phone`
- `website`
- `instagram_handle`
- `facebook_page`
- `linkedin_page`
- `role_title`
- `claim_message`

Permission:

- claim owner only

## Business management endpoints

### `PATCH /api/companies/<id>/manage/`

Updates business-editable listing fields for verified business users linked to the company.

Request body:

```json
{
  "description": "Independent neighborhood bookstore with local author events.",
  "website": "https://sunbeambooks.com",
  "instagram_handle": "sunbeambooks",
  "facebook_page": "https://facebook.com/sunbeambooks",
  "business_category": "category_id",
  "address": "123 Main St",
  "city": "Los Angeles",
  "state": "CA",
  "zip_code": "90001",
  "country": "USA",
  "hours_text": "Mon-Fri 10am-7pm; Sat-Sun 10am-6pm",
  "product_categories": ["category_a", "category_b"]
}
```

Permission:

- admin, or
- verified business user with an approved claim for that company

Response `200` returns the updated company management payload.

## Favorites endpoints

### `GET /api/favorites/`

Returns favorites owned by the current user.

### `POST /api/favorites/`

Request body:

```json
{
  "company": "company_id"
}
```

### `DELETE /api/favorites/<id>/`

Deletes a favorite if owned by current user.

Permission:

- personal users
- verified business users

MVP rule:

- pending business users should not create favorites until verification is complete

## Lists endpoints

### `GET /api/lists/`

Returns user-owned lists.

### `POST /api/lists/`

Request body:

```json
{
  "title": "Local places I recommend",
  "description": "Neighborhood favorites for gifts and coffee.",
  "is_public": true
}
```

### `PATCH /api/lists/<id>/`

Editable fields:

- `title`
- `description`
- `is_public`

### `POST /api/lists/<id>/items/`

Request body:

```json
{
  "company": "company_id",
  "note": "Great community events and thoughtful curation.",
  "position": 1
}
```

### `DELETE /api/lists/<id>/items/<item_id>/`

Permission:

- list owner only

## Recommendation endpoints

### `GET /api/recommendations/`

Returns public recommendations.

### `POST /api/recommendations/`

Request body:

```json
{
  "company": "company_id",
  "title": "A neighborhood staple",
  "body": "Thoughtful inventory, warm staff, and strong local partnerships.",
  "is_public": true
}
```

Permission:

- personal users
- verified business users

## Permission matrix

| Capability | Personal | Business pending | Business verified | Admin |
| --- | --- | --- | --- | --- |
| Register | yes | yes | yes | yes |
| Log in | yes | yes | yes | yes |
| Edit personal profile | yes | no | no | yes |
| Submit business claim | no | yes | yes | yes |
| Edit pending claim | no | yes | yes | yes |
| Edit public company listing | no | no | yes | yes |
| Create favorites | yes | no | yes | yes |
| Create lists | yes | no | yes | yes |
| Create recommendations | yes | no | yes | yes |
| Approve claims | no | no | no | yes |

## Serializer plan

## users serializers

Update [users/serializers.py](/Users/michelleflores/code/found/users/serializers.py):

- `UserSerializer`
  - include `display_name`
  - include `account_type`
  - include derived `is_business_verified`
  - include derived `verification_status`
- `RegisterSerializer`
  - accept `account_type`
  - accept `display_name`
  - keep `account_type` immutable after creation
- `PersonalProfileSerializer`
- `BusinessClaimSerializer`
- `BusinessClaimUpdateSerializer`
- `CustomTokenObtainPairSerializer`

## companies serializers

Update [companies/serializers.py](/Users/michelleflores/code/found/companies/serializers.py):

- keep public company serializers intact
- add `BusinessManagedCompanySerializer` for safe editable fields

## View and routing plan

## users views

Update [users/views.py](/Users/michelleflores/code/found/users/views.py):

- keep `RegisterView`
- keep `MeView`
- add `PersonalProfileView`
- add `BusinessClaimListCreateView`
- add `BusinessClaimDetailView`
- add `BusinessClaimStatusView` if helpful
- add `CustomTokenObtainPairView`

## companies views

Update [companies/views.py](/Users/michelleflores/code/found/companies/views.py):

- keep public directory endpoints unchanged
- add `CompanyManageView`

## routing

Update [users/urls.py](/Users/michelleflores/code/found/users/urls.py):

- add profile and business-claim routes

Update [config/api_urls.py](/Users/michelleflores/code/found/config/api_urls.py):

- replace stock token endpoint with custom token view
- include community routes once that app exists

## Admin plan

Update [users/admin.py](/Users/michelleflores/code/found/users/admin.py):

- add `account_type` to `list_display`
- add `account_type` to `list_filter`
- include `display_name` in fieldsets

Register new models:

- `PersonalProfileAdmin`
- `BusinessClaimAdmin`

Business claim admin should support:

- filtering by `status`
- searching by `business_name`, `business_email`, `company__name`, `user__email`
- admin actions for `mark_verified` and `mark_rejected`

On verification action:

- set `status=verified`
- set `reviewed_at`
- set `reviewed_by`
- optionally stamp `Company.claimed_at` if empty

## Frontend contract

Relevant frontend code:

- [frontend/lib/api.ts](/Users/michelleflores/code/found/frontend/lib/api.ts)
- [frontend/components/site-header.tsx](/Users/michelleflores/code/found/frontend/components/site-header.tsx)

Recommended new pages:

- `frontend/app/signup/page.tsx`
- `frontend/app/login/page.tsx`
- `frontend/app/account/page.tsx`
- `frontend/app/account/profile/page.tsx`
- `frontend/app/account/favorites/page.tsx`
- `frontend/app/account/lists/page.tsx`
- `frontend/app/business/pending/page.tsx`
- `frontend/app/business/claim/page.tsx`
- `frontend/app/business/dashboard/page.tsx`
- `frontend/app/business/company/[id]/edit/page.tsx`

Frontend state needed from `/api/users/me/`:

- `account_type`
- `is_business_verified`
- `verification_status`

Routing behavior:

- personal user -> account dashboard
- business pending -> pending dashboard
- business verified -> business dashboard

## Migration sequence

Recommended order:

1. Add `User.account_type`, `display_name`, `onboarding_completed`
2. Add `PersonalProfile`
3. Add `BusinessClaim`
4. Add optional `Company.hours_text` and `claimed_at`
5. Add community models

Backward compatibility:

- existing users should default to `personal`
- existing admin users continue to work normally

## Testing plan

Backend tests should cover:

- personal registration success
- business registration success
- duplicate email registration rejection
- personal login success
- business login success with pending status payload
- strict login rejection if strict mode is chosen
- claim creation by business users
- claim creation rejected for personal users
- company editing allowed for verified business users
- company editing denied for pending business users
- favorites/lists/recommendations permission checks

Frontend tests or QA flows should cover:

- signup account-type selection
- pending business dashboard state
- verified business dashboard state
- personal favorites and list creation

## MVP implementation order

Phase 1:

- user account fields
- business claim model
- admin verification flow
- `/me` payload updates

Phase 2:

- custom token endpoint
- business pending dashboard
- business listing management API

Phase 3:

- favorites
- lists
- recommendations
- personal profile

## Open questions

These are still worth confirming before implementation:

- Should pending business users be able to create private favorites and lists before verification, or should all business community features wait until verified?
- Should a business user be allowed to claim multiple companies in MVP?
- Should approved business edits go live immediately or create a moderation queue later?

## Recommended defaults

To keep MVP focused:

- Allow multiple claims over time, but optimize UI for one primary company
- Let verified business edits publish immediately
- Restrict pending business users to claim management only
- Keep personal profiles private by default
