import {
  BusinessClaim,
  BusinessClaimPayload,
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  AuthUser,
} from "@/types/auth";
import { CuratedList, CuratedListItem, Favorite, PublicCuratedList } from "@/types/community";
import { PersonalProfile, PublicProfile } from "@/types/profile";
import { Recommendation } from "@/types/recommendation";
import {
  CompanyDetail,
  CompanyListItem,
  ManagedBusinessProfile,
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
  return fetchJson<CompanyDetail>(`companies/${slug}/`);
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
  return fetchJson<PublicCuratedList>(`community/public-lists/${idHash}/`);
}

export function getPublicProfile(publicSlug: string) {
  return fetchJson<PublicProfile>(`users/public-profiles/${publicSlug}/`);
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
