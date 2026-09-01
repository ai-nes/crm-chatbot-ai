export async function POST(req: Request, context: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await context.params;
  if (!proposalId) {
    return Response.json({ error: "proposalId is required" }, { status: 400 });
  }

  const environment = process["env"] as Record<string, string | undefined>;
  const apiUrl = (environment["NEXT_PUBLIC_API_URL"] ?? "").replace(/\/$/, "");
  const apiKey = environment["CHAT_API_KEY"] ?? "CHANGE_ME_to_a_long_random_secret";
  const body = await req.text();
  const upstream = await fetch(
    `${apiUrl}/api/v1/chat/actions/${encodeURIComponent(proposalId)}/resume`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body,
    }
  );
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
