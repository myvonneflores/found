export type TaxonomyItem = {
  id: number;
  id_hash: string;
  name: string;
  description: string;
};

export type ListingOrigin = "imported" | "owner" | "community";

export type BusinessHoursInterval = {
  start: string;
  end: string;
};

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type BusinessHours = {
  open_by_week: Record<Weekday, BusinessHoursInterval[]>;
  open_by_date: Record<string, BusinessHoursInterval[]>;
};

export type ClaimedCompanyPublicList = {
  id: number;
  id_hash: string;
  title: string;
  description: string;
  updated_at: string;
  item_count: number;
};

export type ClaimedCompanyProfile = {
  display_name: string;
  public_slug: string;
  account_type: "personal" | "business";
  public_list_count: number;
  public_lists: ClaimedCompanyPublicList[];
};

export type CompanyDomainMatchCompany = {
  id: number;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
};

export type CompanySiblingLocation = {
  id: number;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
};

export type CompanyRecommendation = {
  id: number;
  id_hash: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type CompanyListItem = {
  id: number;
  id_hash: string;
  name: string;
  slug: string;
  description: string;
  listing_origin: ListingOrigin;
  is_community_listed: boolean;
  city: string;
  state: string;
  country: string;
  business_category: string | null;
  business_categories: string[];
  product_categories: string[];
  cuisine_types: string[];
  ownership_markers: string[];
  sustainability_markers: string[];
  is_vegan_friendly: boolean;
  is_gf_friendly: boolean;
};

export type CompanyDomainMatch = {
  matched: boolean;
  companies: CompanyDomainMatchCompany[];
};

export type CompanyDetail = {
  id: number;
  id_hash: string;
  name: string;
  slug: string;
  description: string;
  listing_origin: ListingOrigin;
  is_community_listed: boolean;
  website: string;
  founded_year: number | null;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  business_hours: BusinessHours | null;
  business_hours_timezone: string | null;
  business_category: TaxonomyItem | null;
  business_categories: TaxonomyItem[];
  product_categories: TaxonomyItem[];
  cuisine_types: TaxonomyItem[];
  claimed_profile: ClaimedCompanyProfile | null;
  other_locations: CompanySiblingLocation[];
  public_recommendations: CompanyRecommendation[];
  ownership_markers: TaxonomyItem[];
  sustainability_markers: TaxonomyItem[];
  instagram_handle: string;
  facebook_page: string;
  linkedin_page: string;
  is_vegan_friendly: boolean;
  is_gf_friendly: boolean;
  created_at: string;
  updated_at: string;
};

export type ManagedBusinessProfile = {
  id: number;
  slug: string;
  name: string;
  description: string;
  website: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  business_hours: BusinessHours | null;
  business_hours_timezone: string | null;
  business_category: number | null;
  business_categories: number[];
  product_categories: number[];
  cuisine_types: number[];
  ownership_markers: number[];
  sustainability_markers: number[];
  instagram_handle: string;
  facebook_page: string;
  linkedin_page: string;
  is_vegan_friendly: boolean;
  is_gf_friendly: boolean;
  is_published: boolean;
};

export type ManagedBusinessLocation = {
  id: number;
  slug: string;
  name: string;
  address: string;
  city: string;
  state: string;
  is_published: boolean;
};

export type CompanyCreatePayload = Omit<ManagedBusinessProfile, "id" | "slug" | "is_published">;

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type CompanySearchParams = {
  search?: string;
  city?: string;
  state?: string;
  country?: string;
  business_category?: string;
  product_categories?: string;
  ownership_markers?: string;
  sustainability_markers?: string;
  is_vegan_friendly?: string;
  is_gf_friendly?: string;
  ordering?: string;
  selected?: string;
};
