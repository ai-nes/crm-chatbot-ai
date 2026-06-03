import type { Metadata } from "next";
import { ChatbotPage } from "@/components/chatbot/chatbot-page";

export const metadata: Metadata = {
  title: "Chatbot",
  description: "Trợ lý AI hỗ trợ tra cứu khách hàng, ticket và báo cáo CRM",
};

export default function ChatbotRoute() {
  return <ChatbotPage />;
}
