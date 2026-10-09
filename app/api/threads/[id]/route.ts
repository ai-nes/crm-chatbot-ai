import { proxyAssistant } from "@/lib/chat/backend";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const pathOf = async ({ params }: Context) => `/threads/${encodeURIComponent((await params).id)}`;

export async function GET(req: Request, ctx: Context) {
  return proxyAssistant(req, await pathOf(ctx));
}

export async function PATCH(req: Request, ctx: Context) {
  return proxyAssistant(req, await pathOf(ctx), { method: "PATCH", body: await req.text() });
}

export async function DELETE(req: Request, ctx: Context) {
  return proxyAssistant(req, await pathOf(ctx), { method: "DELETE" });
}
