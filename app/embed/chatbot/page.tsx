import type { Metadata } from "next";
import { ChatbotPage } from "@/components/chatbot/chatbot-page";

export const metadata: Metadata = {
  title: "CRM Chatbot Embed",
  description: "CRM Chatbot embedded experience",
};

type EmbeddedChatbotRouteProps = {
  searchParams: Promise<{ mode?: string | string[] }>;
};

export default async function EmbeddedChatbotRoute({ searchParams }: EmbeddedChatbotRouteProps) {
  const params = await searchParams;
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;

  const popover = mode === "popover";

  return <ChatbotPage embedded fullscreen={!popover} popover={popover} />;
}
