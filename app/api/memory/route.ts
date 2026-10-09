import { proxyAssistant } from "@/lib/chat/backend";

export const dynamic = "force-dynamic";

/** Những gì trợ lý đang nhớ về người dùng. */
export function GET(req: Request) {
  return proxyAssistant(req, "/memory");
}
