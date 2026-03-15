export type AccountType = "personal" | "business";

export type VerificationStatus = "pending" | "verified" | "rejected" | null;
export type BusinessClaimIntent = "existing" | "new";
export type BusinessClaimDecisionReasonCode =
  | "insufficient_connection"
  | "missing_company_match"
  | "missing_contact_details"
  | "incomplete_submission"
  | "other"
  | "";

export interface BusinessClaimHistoryEvent {
  event_type: "submitted" | "resubmitted" | "approved" | "rejected";
  event_label: string;
  actor_display: string;
  occurred_at: string;
  metadata: Record<string, unknown>;
}

export interface AuthUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  public_slug: string;
  account_type: AccountType;
  onboarding_completed: boolean;
  is_business_verified: boolean;
  verification_status: VerificationStatus;
}

export interface LoginResponse {
  refresh: string;
  access: string;
  user: AuthUser;
}

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  display_name: string;
  account_type: AccountType;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface BusinessClaim {
  id: number;
  company: number | null;
  company_name?: string;
  company_slug?: string;
  intent: BusinessClaimIntent;
  status: Exclude<VerificationStatus, null>;
  business_name: string;
  submitter_first_name: string;
  submitter_last_name: string;
  business_email: string;
  business_phone: string;
  website: string;
  instagram_handle: string;
  facebook_page: string;
  linkedin_page: string;
  role_title: string;
  claim_message: string;
  decision_reason_code: BusinessClaimDecisionReasonCode;
  decision_reason_label: string;
  review_checklist: string[];
  review_checklist_labels: string[];
  review_notes: string;
  resubmitted_at: string | null;
  resubmission_count: number;
  submitted_at: string;
  reviewed_at: string | null;
  history: BusinessClaimHistoryEvent[];
}

export interface BusinessClaimPayload {
  company?: number | null;
  intent: BusinessClaimIntent;
  business_name: string;
  submitter_first_name: string;
  submitter_last_name: string;
  business_email: string;
  business_phone?: string;
  website?: string;
  instagram_handle?: string;
  facebook_page?: string;
  linkedin_page?: string;
  role_title?: string;
  claim_message?: string;
}
