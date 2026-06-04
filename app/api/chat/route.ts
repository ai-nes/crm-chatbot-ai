import { type UIMessage } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json();
  const messages = body.messages as UIMessage[];

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json(
      { error: "messages phải là mảng không rỗng" },
      { status: 400 },
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.CHAT_API_KEY ?? "CHANGE_ME_to_a_long_random_secret";

  const upstream = await fetch(`${apiUrl}/api/v1/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ messages }),
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return Response.json(
      { error: text || upstream.statusText },
      { status: upstream.status },
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
