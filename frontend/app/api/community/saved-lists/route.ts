import { proxyApiRequest } from "@/app/api/community/_backend";

export async function GET(request: Request) {
  return proxyApiRequest(request, "community/saved-lists/");
}

export async function POST(request: Request) {
  const body = await request.text();
  return proxyApiRequest(request, "community/saved-lists/", {
    method: "POST",
    body,
  });
}
