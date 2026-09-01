export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export const SITE = {
  name: "Fpilot",
  shortName: "CRM",
  defaultDescription: "Fpilot — hỗ trợ tuyển sinh thông minh",
  locale: "vi_VN",
};
