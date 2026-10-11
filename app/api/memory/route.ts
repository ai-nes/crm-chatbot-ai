import { proxyAssistant } from "@/lib/chat/backend";

export const dynamic = "force-dynamic";

/** Những gì trợ lý đang nhớ về người dùng. */
export function GET(req: Request) {
  const values = new URL(req.url).searchParams.getAll("student_id");
  if (values.length > 1 || (values.length === 1 && !values[0].trim())) {
    return Response.json({ error: "student_id must be a non-empty string" }, { status: 400 });
  }
  const studentId = values[0]?.trim();
  return proxyAssistant(req, studentId ? `/memory?student_id=${encodeURIComponent(studentId)}` : "/memory");
}
