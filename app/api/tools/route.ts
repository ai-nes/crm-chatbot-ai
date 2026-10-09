import { proxyAssistant } from "@/lib/chat/backend";

export const dynamic = "force-dynamic";

/** Tên công cụ -> nhãn tiếng Việt do trợ lý AI cung cấp. */
export function GET(req: Request) {
  return proxyAssistant(req, "/tools");
}
