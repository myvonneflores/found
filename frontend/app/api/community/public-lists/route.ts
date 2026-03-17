import { proxyApiRequest } from "@/app/api/community/_backend";

export async function GET(request: Request) {
  return proxyApiRequest(request, "community/public-lists/");
}
