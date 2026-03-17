import { proxyApiRequest } from "@/app/api/community/_backend";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyApiRequest(request, `community/saved-lists/${id}/`, {
    method: "DELETE",
  });
}
