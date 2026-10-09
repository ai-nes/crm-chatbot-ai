import { proxyAssistant } from "@/lib/chat/backend";

export const dynamic = "force-dynamic";

/** Danh sách hội thoại của người dùng đang đăng nhập (lưu phía trợ lý AI). */
export function GET(req: Request) {
  return proxyAssistant(req, "/threads");
}
