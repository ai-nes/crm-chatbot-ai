/** Địa chỉ crm-backend (server-side). Dev mặc định :3001; production bắt buộc đặt `CRM_BACKEND_URL`. */
export function backendUrl(): string {
  const configured = process.env.CRM_BACKEND_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("CRM_BACKEND_URL is not configured");
  }
  return "http://localhost:3001";
}

/**
 * Cookie phiên đăng nhập CRM là cookie theo host (không theo cổng), nên chatbot
 * chạy khác cổng với dashboard vẫn nhận được. Chỉ chuyển tiếp cookie Better Auth.
 */
export function betterAuthCookies(cookieHeader: string | null): string {
  return (cookieHeader ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => {
      const [name, value] = part.split("=", 2);
      return Boolean(value) && name.includes("better-auth");
    })
    .join("; ");
}

/**
 * Chuyển một lời gọi `/api/v1/assistant/*` sang crm-backend bằng cookie phiên của người dùng
 * và trả nguyên câu trả lời (kể cả lỗi) để trình duyệt xử lý theo status.
 */
export async function proxyAssistant(
  req: Request,
  path: string,
  init: { method?: string; body?: string } = {},
): Promise<Response> {
  const cookie = betterAuthCookies(req.headers.get("cookie"));
  if (!cookie) {
    return Response.json({ error: "Chưa đăng nhập CRM" }, { status: 401 });
  }
  let upstream: Response;
  try {
    upstream = await fetch(`${backendUrl()}/api/v1/assistant${path}`, {
      method: init.method ?? "GET",
      headers: {
        Cookie: cookie,
        ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(init.body === undefined ? {} : { body: init.body }),
      cache: "no-store",
      signal: req.signal,
    });
  } catch {
    return Response.json({ error: "Không kết nối được crm-backend" }, { status: 502 });
  }
  if (upstream.status === 204) return new Response(null, { status: 204 });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
