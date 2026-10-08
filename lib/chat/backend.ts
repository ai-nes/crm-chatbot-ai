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
