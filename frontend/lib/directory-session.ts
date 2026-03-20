export const DIRECTORY_FILTER_STORAGE_KEY = "found-directory-filters";

export function buildStoredDirectoryHref(serializedFilters?: string | null) {
  const normalized = serializedFilters?.trim();
  return normalized ? `/companies?${normalized}` : "/companies";
}

export function getStoredDirectoryHref() {
  if (typeof window === "undefined") {
    return "/companies";
  }

  return buildStoredDirectoryHref(window.localStorage.getItem(DIRECTORY_FILTER_STORAGE_KEY));
}
