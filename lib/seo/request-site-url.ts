import { headers } from "next/headers";
import { getSiteUrl } from "./site";

export async function getSiteUrlFromRequest(): Promise<string> {
  try {
    const headersList = await headers();
    const host =
      headersList.get("x-forwarded-host") || headersList.get("host") || "";
    const proto = headersList.get("x-forwarded-proto") || "https";
    if (host) return `${proto}://${host}`;
  } catch {
    // headers() not available outside server context
  }
  return getSiteUrl();
}
