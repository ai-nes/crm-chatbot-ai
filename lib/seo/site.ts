export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export const SITE = {
  name: "CRM Chatbot",
  shortName: "CRM",
  defaultDescription: "CRM Chatbot — hỗ trợ khách hàng thông minh",
  locale: "vi_VN",
};
