const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

function normalizeOrigin(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function buildForwardedOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (!forwardedHost) {
    return null;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const requestProtocol = new URL(request.url).protocol.replace(":", "");
  const protocol = forwardedProto || requestProtocol || "https";
  return normalizeOrigin(`${protocol}://${forwardedHost}`);
}

export function isAllowedContactSubmissionOrigin(
  request: Request,
  originHeader: string | null,
  publicSiteUrl = PUBLIC_SITE_URL
) {
  if (!originHeader) {
    return true;
  }

  const submittedOrigin = normalizeOrigin(originHeader);
  if (!submittedOrigin) {
    return false;
  }

  const requestOrigin = normalizeOrigin(request.url);
  const forwardedOrigin = buildForwardedOrigin(request);
  const configuredOrigin = normalizeOrigin(publicSiteUrl);

  return [requestOrigin, forwardedOrigin, configuredOrigin].some(
    (allowedOrigin) => allowedOrigin === submittedOrigin
  );
}
