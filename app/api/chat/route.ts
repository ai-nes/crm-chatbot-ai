import { pickMessagesForUpstream } from "@/lib/chat/upstream-messages";
import { backendUrl, betterAuthCookies } from "@/lib/chat/backend";
import { type UIMessage } from "ai";

export const maxDuration = 300;

/**
 * Một lượt chat đi qua crm-backend (`/api/v1/assistant/chat`): backend xác thực
 * phiên Better Auth của người dùng rồi chuyển tiếp cho trợ lý AI. Trình duyệt
 * không bao giờ giữ khóa của dịch vụ AI.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages?: UIMessage[];
    id?: string;
    trigger?: string;
  };
  const messages = body.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Tin nhắn không hợp lệ" }, { status: 400 });
  }

  const upstreamMessages = pickMessagesForUpstream(messages);
  if (!upstreamMessages) {
    return Response.json({ error: "Thiếu tin nhắn người dùng" }, { status: 400 });
  }

  const cookie = betterAuthCookies(req.headers.get("cookie"));
  if (!cookie) {
    return Response.json({ error: "Chưa đăng nhập CRM" }, { status: 401 });
  }

  const upstreamBody: { messages: UIMessage[]; id?: string; trigger?: string } = {
    messages: upstreamMessages,
  };
  if (typeof body.id === "string" && body.id.length > 0) upstreamBody.id = body.id;
  if (typeof body.trigger === "string") upstreamBody.trigger = body.trigger;

  let upstream: Response;
  try {
    upstream = await fetch(`${backendUrl()}/api/v1/assistant/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Cookie: cookie,
      },
      body: JSON.stringify(upstreamBody),
      signal: req.signal,
    });
  } catch {
    return Response.json({ error: "Không kết nối được crm-backend" }, { status: 502 });
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return Response.json(
      { error: errorMessageOf(text) || upstream.statusText },
      { status: upstream.status },
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      // Luồng UI message của AI SDK v6 cần header này để client nhận diện.
      "x-vercel-ai-ui-message-stream": "v1",
    },
  });
}

/** crm-backend answers `{error:{message}}`, crm-ai `{detail}`; show the sentence, not the JSON. */
function errorMessageOf(text: string): string {
  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: string } | string;
      detail?: unknown;
    };
    if (typeof parsed.error === "string") return parsed.error;
    if (parsed.error?.message) return parsed.error.message;
    if (typeof parsed.detail === "string") return parsed.detail;
  } catch {
    // Not JSON: keep the text as is.
  }
  return text;
}
