import {
  BusinessClaim,
  BusinessClaimPayload,
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  AuthUser,
} from "@/types/auth";
import {
  CuratedList,
  CuratedListItem,
  Favorite,
  PublicCuratedList,
  PublicCuratedListPreview,
  SavedCuratedList,
} from "@/types/community";
import { PersonalProfile, PublicProfile } from "@/types/profile";
import { Recommendation } from "@/types/recommendation";
import {
  CompanyDetail,
  CompanyCreatePayload,
  CompanyListItem,
  ManagedBusinessProfile,
  CompanySearchParams,
  PaginatedResponse,
  TaxonomyItem,
} from "@/types/company";

const PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api";
const INTERNAL_API_BASE_URL = process.env.INTERNAL_API_BASE_URL ?? PUBLIC_API_BASE_URL;
const APP_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function buildUrl(path: string, searchParams?: Record<string, string | undefined>) {
  const baseUrl = typeof window === "undefined" ? INTERNAL_API_BASE_URL : PUBLIC_API_BASE_URL;
  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
  }
  return url.toString();
}

async function fetchJson<T>(
  path: string,
  searchParams?: Record<string, string | undefined>,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(buildUrl(path, searchParams), {
    ...(init ?? {}),
    ...(init?.cache ? {} : { next: { revalidate: 300 } }),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = `Request failed: ${response.status}`;

    try {
      const data = (await response.json()) as Record<string, unknown>;
      const firstEntry = Object.entries(data)[0];
      if (typeof data.detail === "string") {
        detail = data.detail;
      } else if (firstEntry) {
        const value = firstEntry[1];
        if (Array.isArray(value) && typeof value[0] === "string") {
          detail = value[0];
        } else if (typeof value === "string") {
          detail = value;
        }
      }
    } catch {
      // Fall back to the generic message when the response is not JSON.
    }

    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function fetchAppJson<T>(
  path: string,
  searchParams?: Record<string, string | undefined>,
  init?: RequestInit
): Promise<T> {
  const baseUrl = typeof window === "undefined" ? APP_BASE_URL : window.location.origin;
  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
  }

  const response = await fetch(url.toString(), {
    ...(init ?? {}),
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = `Request failed: ${response.status}`;

    try {
      const data = (await response.json()) as Record<string, unknown>;
      const firstEntry = Object.entries(data)[0];
      if (typeof data.detail === "string") {
        detail = data.detail;
      } else if (firstEntry) {
        const value = firstEntry[1];
        if (Array.isArray(value) && typeof value[0] === "string") {
          detail = value[0];
        } else if (typeof value === "string") {
          detail = value;
        }
      }
    } catch {
      // Fall back to the generic message when the response is not JSON.
    }

    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

async function requestAppJson<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = typeof window === "undefined" ? APP_BASE_URL : window.location.origin;
  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);

  const response = await fetch(url.toString(), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = `Request failed: ${response.status}`;

    try {
      const data = (await response.json()) as Record<string, unknown>;
      const firstEntry = Object.entries(data)[0];
      if (typeof data.detail === "string") {
        detail = data.detail;
      } else if (firstEntry) {
        const value = firstEntry[1];
        if (Array.isArray(value) && typeof value[0] === "string") {
          detail = value[0];
        } else if (typeof value === "string") {
          detail = value;
        }
      }
    } catch {
      // Fall back to the generic message when the response is not JSON.
    }

    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function unwrapListResponse<T>(data: T[] | PaginatedResponse<T>): T[] {
  return Array.isArray(data) ? data : data.results;
}

export function listCompanies(searchParams: CompanySearchParams) {
  return fetchJson<PaginatedResponse<CompanyListItem>>("companies/", {
    ...searchParams,
    page_size: "200",
  });
}

export function getCompany(slug: string) {
  return fetchJson<CompanyDetail>(`companies/${slug}/`, undefined, {
    cache: "no-store",
  });
}

export function getManagedBusinessProfile(token: string) {
  return requestJson<ManagedBusinessProfile>("companies/manage/current/", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function updateManagedBusinessProfile(
  token: string,
  payload: Omit<ManagedBusinessProfile, "id">
) {
  return requestJson<ManagedBusinessProfile>("companies/manage/current/", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function createManagedBusinessProfile(
  token: string,
  payload: Omit<ManagedBusinessProfile, "id" | "slug">
) {
  return requestJson<ManagedBusinessProfile>("companies/manage/current/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function createCommunityListing(token: string, payload: CompanyCreatePayload) {
  return requestJson<ManagedBusinessProfile>("companies/community-listings/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
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

export function registerUser(payload: RegisterPayload) {
  return requestJson<AuthUser>("users/register/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload: LoginPayload) {
  return requestJson<LoginResponse>("auth/token/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function refreshAccessToken(refresh: string) {
  return requestJson<{ access: string; refresh?: string }>("auth/token/refresh/", {
    method: "POST",
    body: JSON.stringify({ refresh }),
  });
}

export function getCurrentUser(token: string) {
  return requestJson<AuthUser>("users/me/", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function listBusinessClaims(token: string) {
  return requestJson<BusinessClaim[] | PaginatedResponse<BusinessClaim>>("users/business-claims/", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then(unwrapListResponse);
}

export function createBusinessClaim(token: string, payload: BusinessClaimPayload) {
  return requestJson<BusinessClaim>("users/business-claims/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function updateBusinessClaim(token: string, claimId: number, payload: Partial<BusinessClaimPayload>) {
  return requestJson<BusinessClaim>(`users/business-claims/${claimId}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function listFavorites(token: string) {
  return requestJson<Favorite[] | PaginatedResponse<Favorite>>("community/favorites/", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then(unwrapListResponse);
}

export function createFavorite(token: string, companyId: number) {
  return requestJson<Favorite>("community/favorites/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ company_id: companyId }),
  });
}

export function deleteFavorite(token: string, favoriteId: number) {
  return requestJson<void>(`community/favorites/${favoriteId}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function listCuratedLists(token: string) {
  return requestJson<CuratedList[] | PaginatedResponse<CuratedList>>("community/lists/", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then(unwrapListResponse);
}

export function createCuratedList(
  token: string,
  payload: Pick<CuratedList, "title" | "description" | "is_public">
) {
  return requestJson<CuratedList>("community/lists/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function getCuratedListByHash(token: string, idHash: string) {
  return requestJson<PublicCuratedList>(`community/lists/by-id-hash/${idHash}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function updateCuratedList(
  token: string,
  listId: number,
  payload: Pick<CuratedList, "title" | "description" | "is_public">
) {
  return requestJson<CuratedList>(`community/lists/${listId}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function deleteCuratedList(token: string, listId: number) {
  return requestJson<void>(`community/lists/${listId}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function addCuratedListItem(
  token: string,
  listId: number,
  payload: { company_id: number; note?: string; position?: number }
) {
  return requestJson<CuratedListItem>(`community/lists/${listId}/items/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function updateCuratedListItem(
  token: string,
  itemId: number,
  payload: { note?: string; position?: number }
) {
  return requestJson<CuratedListItem>(`community/lists/items/${itemId}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function deleteCuratedListItem(token: string, itemId: number) {
  return requestJson<void>(`community/lists/items/${itemId}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getPublicCuratedList(idHash: string) {
  return fetchJson<PublicCuratedList>(`community/public-lists/${idHash}/`, undefined, {
    cache: "no-store",
  });
}

export function listPublicCuratedLists(search?: string) {
  return fetchAppJson<PublicCuratedListPreview[] | PaginatedResponse<PublicCuratedListPreview>>(
    "/api/community/public-lists",
    search ? { search } : undefined,
  ).then(unwrapListResponse);
}

export function listSavedCuratedLists(token: string) {
  return requestAppJson<SavedCuratedList[] | PaginatedResponse<SavedCuratedList>>("/api/community/saved-lists", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then(unwrapListResponse);
}

export function createSavedCuratedList(token: string, curatedListId: number) {
  return requestAppJson<SavedCuratedList>("/api/community/saved-lists", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ curated_list_id: curatedListId }),
  });
}

export function deleteSavedCuratedList(token: string, savedListId: number) {
  return requestAppJson<void>(`/api/community/saved-lists/${savedListId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getPublicProfile(publicSlug: string) {
  return fetchJson<PublicProfile>(`users/public-profiles/${publicSlug}/`, undefined, {
    cache: "no-store",
  });
}

export function getPersonalProfile(token: string) {
  return requestJson<PersonalProfile>("users/me/profile/", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function updatePersonalProfile(
  token: string,
  payload: PersonalProfile
) {
  return requestJson<PersonalProfile>("users/me/profile/", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function listRecommendations(token: string) {
  return requestJson<Recommendation[] | PaginatedResponse<Recommendation>>("community/recommendations/", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then(unwrapListResponse);
}

export function createRecommendation(
  token: string,
  payload: { company_id: number; title: string; body: string; is_public: boolean }
) {
  return requestJson<Recommendation>("community/recommendations/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function updateRecommendation(
  token: string,
  recommendationId: number,
  payload: { title?: string; body?: string; is_public?: boolean }
) {
  return requestJson<Recommendation>(`community/recommendations/${recommendationId}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function deleteRecommendation(token: string, recommendationId: number) {
  return requestJson<void>(`community/recommendations/${recommendationId}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
