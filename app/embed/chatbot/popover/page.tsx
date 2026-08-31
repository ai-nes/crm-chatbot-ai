import type { Metadata } from "next";
import { PopoverChatbot } from "@/components/embed/popover-chatbot";

export const metadata: Metadata = {
  title: "CRM Chatbot Popover",
  description: "CRM Chatbot popover embed",
};

export default function EmbeddedChatbotPopoverRoute() {
  return <PopoverChatbot />;
}
