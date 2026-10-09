import { proxyAssistant } from "@/lib/chat/backend";

export const dynamic = "force-dynamic";

/** Bảo trợ lý quên một ghi chú. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return proxyAssistant(req, `/memory/${encodeURIComponent((await params).id)}`, { method: "DELETE" });
}
