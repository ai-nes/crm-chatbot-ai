// Liveness probe for the container healthcheck and post-deploy verification.
// Kept dependency-free so it succeeds even when upstream services are down.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok", service: "crm-chatbot" });
}
