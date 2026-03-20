const DEFAULT_SITE_URL = "http://localhost:3000";

function normalizeSiteUrl(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function getSiteUrl() {
  return (
    normalizeSiteUrl(process.env.SITE_URL) ??
    normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    DEFAULT_SITE_URL
  );
}

export function getAbsoluteSiteUrl(path: string) {
  return new URL(path, getSiteUrl()).toString();
}
