import { proxyAssistant } from "@/lib/chat/backend";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

function studentQuery(req: Request): string | Response {
  const url = new URL(req.url);
  const values = url.searchParams.getAll("student_id");
  const studentId = values[0]?.trim();
  if (values.length > 1 || (values.length === 1 && !studentId)) {
    return Response.json({ error: "student_id không hợp lệ" }, { status: 400 });
  }
  return studentId ? `?student_id=${encodeURIComponent(studentId)}` : "";
}

const pathOf = async ({ params }: Context) => `/threads/${encodeURIComponent((await params).id)}`;

export async function GET(req: Request, ctx: Context) {
  const query = studentQuery(req);
  if (query instanceof Response) return query;
  return proxyAssistant(req, `${await pathOf(ctx)}${query}`);
}

export async function PATCH(req: Request, ctx: Context) {
  const query = studentQuery(req);
  if (query instanceof Response) return query;
  return proxyAssistant(req, `${await pathOf(ctx)}${query}`, { method: "PATCH", body: await req.text() });
}

export async function DELETE(req: Request, ctx: Context) {
  const query = studentQuery(req);
  if (query instanceof Response) return query;
  return proxyAssistant(req, `${await pathOf(ctx)}${query}`, { method: "DELETE" });
}
