import type { Metadata } from "next";
import { ChatbotPage } from "@/components/chatbot/chatbot-page";

export const metadata: Metadata = {
  title: "CRM Chatbot Embed",
  description: "CRM Chatbot embedded experience",
};

type EmbeddedChatbotRouteProps = {
  searchParams: Promise<{
    mode?: string | string[];
    studentId?: string | string[];
  }>;
};

export default async function EmbeddedChatbotRoute({ searchParams }: EmbeddedChatbotRouteProps) {
  const params = await searchParams;
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const hasStudentScope = params.studentId !== undefined;
  if (
    hasStudentScope &&
    (Array.isArray(params.studentId)
      ? params.studentId.length !== 1 || !params.studentId[0]?.trim()
      : !params.studentId?.trim())
  ) {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-sm text-red-700">
        Student ID không hợp lệ. Hãy mở chat từ hồ sơ học sinh trong CRM.
      </main>
    );
  }
  const studentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;

  const popover = mode === "popover";

  return (
    <ChatbotPage
      key={studentId || "general"}
      embedded
      fullscreen={!popover}
      popover={popover}
      studentId={studentId?.trim() || undefined}
    />
  );
}
