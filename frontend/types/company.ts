export type TaxonomyItem = {
  id: number;
  id_hash: string;
  name: string;
  description: string;
};

export type CompanyListItem = {
  id: number;
  id_hash: string;
  name: string;
  slug: string;
  description: string;
  city: string;
  state: string;
  country: string;
  business_category: string | null;
  product_categories: string[];
  sustainability_markers: string[];
  is_vegan_friendly: boolean;
  is_gf_friendly: boolean;
};

export type CompanyDetail = {
  id: number;
  id_hash: string;
  name: string;
  slug: string;
  description: string;
  website: string;
  founded_year: number | null;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  business_category: TaxonomyItem | null;
  product_categories: TaxonomyItem[];
  sustainability_markers: TaxonomyItem[];
  instagram_handle: string;
  facebook_page: string;
  linkedin_page: string;
  is_vegan_friendly: boolean;
  is_gf_friendly: boolean;
  created_at: string;
  updated_at: string;
};

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
  sustainability_markers?: string;
  is_vegan_friendly?: string;
  is_gf_friendly?: string;
  ordering?: string;
};
