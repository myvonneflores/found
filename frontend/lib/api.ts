import {
  CompanyDetail,
  CompanyListItem,
  CompanySearchParams,
  PaginatedResponse,
  TaxonomyItem,
} from "@/types/company";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000/api";

function buildUrl(path: string, searchParams?: Record<string, string | undefined>) {
  const url = new URL(path, API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
  }
  return url.toString();
}

async function fetchJson<T>(path: string, searchParams?: Record<string, string | undefined>): Promise<T> {
  const response = await fetch(buildUrl(path, searchParams), {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function listCompanies(searchParams: CompanySearchParams) {
  return fetchJson<PaginatedResponse<CompanyListItem>>("companies/", {
    ...searchParams,
    page_size: "200",
  });
}

export function getCompany(slug: string) {
  return fetchJson<CompanyDetail>(`companies/${slug}/`);
}

export function listBusinessCategories() {
  return fetchJson<TaxonomyItem[]>("business-categories/");
}

export function listProductCategories() {
  return fetchJson<TaxonomyItem[]>("product-categories/");
}

export function listCuisineTypes() {
  return fetchJson<TaxonomyItem[]>("cuisine-types/");
}

export function listOwnershipMarkers() {
  return fetchJson<TaxonomyItem[]>("ownership-markers/");
}

export function listSustainabilityMarkers() {
  return fetchJson<TaxonomyItem[]>("sustainability-markers/");
}

export function listCities() {
  return fetchJson<string[]>("cities/");
}

export function hasActiveFilters(searchParams: CompanySearchParams) {
  return Object.entries(searchParams).some(([key, value]) => key !== "selected" && Boolean(value));
}
