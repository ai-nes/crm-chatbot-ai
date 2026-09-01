import { pickLatestUserMessageForUpstream } from "@/lib/chat/upstream-messages";
import { type UIMessage } from "ai";

export const maxDuration = 300;

/**
 * Frappe sessions are host-scoped rather than port-scoped. Keep only the
 * session id when relaying the browser session to Frappe's server-side
 * Copilot BFF; the other browser cookies are not part of this contract.
 */
function frappeSessionCookie(cookieHeader: string | null): string {
  return (cookieHeader ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => {
      const [name, value] = part.split("=", 2);
      return name === "sid" && Boolean(value) && value !== "Guest";
    })
    .join("; ");
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages?: UIMessage[];
    id?: string;
  };
  const messages = body.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Tin nhắn không hợp lệ" }, { status: 400 });
  }

  const latestUser = pickLatestUserMessageForUpstream(messages);
  if (!latestUser) {
    return Response.json({ error: "Thiếu tin nhắn người dùng" }, { status: 400 });
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const frappeUrl = process.env.NEXT_PUBLIC_FRAPPE_URL?.replace(/\/$/, "");
  const apiKey = process.env.CHAT_API_KEY ?? "CHANGE_ME_to_a_long_random_secret";
  const authorization = req.headers.get("authorization");
  const sessionCookie = frappeSessionCookie(req.headers.get("cookie"));

  const upstreamBody: { messages: UIMessage[]; id?: string } = {
    messages: [latestUser],
  };
  if (typeof body.id === "string" && body.id.length > 0) {
    upstreamBody.id = body.id;
  }

  // Prefer Frappe's same-origin Copilot BFF whenever the browser session is
  // available. It mints the short-lived bearer and delegation proof on the
  // server, so the iframe never forwards a stale browser bearer to Agent.
  const useFrappeBff = Boolean(frappeUrl && sessionCookie);
  const upstreamUrl = useFrappeBff
    ? `${frappeUrl}/api/method/crm.api.copilot_delegation.stream_chat`
    : `${apiUrl}/api/v1/chat`;
  const upstreamHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };

  if (useFrappeBff) {
    upstreamHeaders.Cookie = sessionCookie;
    const csrfToken = req.headers.get("x-frappe-csrf-token");
    if (csrfToken) upstreamHeaders["X-Frappe-CSRF-Token"] = csrfToken;
  } else {
    upstreamHeaders["x-api-key"] = apiKey;
    if (authorization) upstreamHeaders.Authorization = authorization;
  }

  const upstream = await fetch(upstreamUrl, {
    method: "POST",
    headers: upstreamHeaders,
    body: JSON.stringify(upstreamBody),
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return Response.json({ error: text || upstream.statusText }, { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
