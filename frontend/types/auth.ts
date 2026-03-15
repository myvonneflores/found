export type AccountType = "personal" | "business";

export type VerificationStatus = "pending" | "verified" | "rejected" | null;

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
  status: Exclude<VerificationStatus, null>;
  business_name: string;
  business_email: string;
  business_phone: string;
  website: string;
  instagram_handle: string;
  facebook_page: string;
  linkedin_page: string;
  role_title: string;
  claim_message: string;
  review_notes: string;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface BusinessClaimPayload {
  company?: number | null;
  business_name: string;
  business_email: string;
  business_phone?: string;
  website?: string;
  instagram_handle?: string;
  facebook_page?: string;
  linkedin_page?: string;
  role_title?: string;
  claim_message?: string;
}
