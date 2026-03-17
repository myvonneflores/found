import { NextResponse } from "next/server";

function uniqueCandidates(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}

function apiBaseCandidates() {
  return uniqueCandidates([
    process.env.INTERNAL_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
    "http://web:8000/api",
    "http://127.0.0.1:8000/api",
    "http://localhost:8000/api",
  ]);
}

export async function proxyApiRequest(
  request: Request,
  path: string,
  init?: { method?: "GET" | "POST" | "DELETE"; body?: string }
) {
  const requestUrl = new URL(request.url);
  const search = requestUrl.search;
  const authorization = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");
  let lastError: unknown = null;

  for (const baseUrl of apiBaseCandidates()) {
    try {
      const targetUrl = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
      if (search) {
        targetUrl.search = search;
      }

      const response = await fetch(targetUrl, {
        method: init?.method ?? request.method,
        headers: {
          ...(authorization ? { Authorization: authorization } : {}),
          ...(contentType ? { "Content-Type": contentType } : {}),
        },
        body: init?.body,
        cache: "no-store",
      });

      const text = await response.text();
      return new NextResponse(text || null, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("content-type") ?? "application/json",
        },
      });
    } catch (error) {
      lastError = error;
    }
  }

  return NextResponse.json(
    {
      detail:
        lastError instanceof Error ? `Unable to reach backend API: ${lastError.message}` : "Unable to reach backend API.",
    },
    { status: 502 }
  );
}
