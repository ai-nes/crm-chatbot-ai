import { proxyAssistant } from "@/lib/chat/backend";

export const dynamic = "force-dynamic";

/** Danh sách hội thoại của người dùng hoặc hồ sơ học sinh đang mở. */
export function GET(req: Request) {
  const url = new URL(req.url);
  const values = url.searchParams.getAll("student_id");
  const studentId = values[0]?.trim();
  if (values.length > 1 || (values.length === 1 && !studentId)) {
    return Response.json({ error: "student_id không hợp lệ" }, { status: 400 });
  }
  const query = studentId ? `?student_id=${encodeURIComponent(studentId)}` : "";
  return proxyAssistant(req, `/threads${query}`);
}
