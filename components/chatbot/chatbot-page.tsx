"use client";

import {
  ChatShell,
  ChatSidebar,
  ChatSidebarToggle,
} from "@/components/chatbot/chat-sidebar";
import { Thread } from "@/components/assistant-ui/thread";
import { usePersistentChatRuntime } from "@/hooks/usePersistentChatRuntime";
import {
  AssistantRuntimeProvider,
  Suggestions,
  useAui,
} from "@assistant-ui/react";
import { AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { seedMockDemoIfNeeded } from "@/lib/chat/seed-mock-demo";
import { useEffect, useState } from "react";

const CRM_SUGGESTIONS = Suggestions([
  {
    title: "Tra cứu khách hàng",
    label: "Thông tin & lịch sử giao dịch",
    prompt: "Làm sao để tra cứu thông tin khách hàng trong CRM?",
  },
  {
    title: "Tạo ticket",
    label: "Hỗ trợ khách hàng",
    prompt: "Hướng dẫn tạo ticket hỗ trợ khách hàng",
  },
  {
    title: "Báo cáo doanh số",
    label: "Pipeline & KPI",
    prompt: "Xem báo cáo doanh số và pipeline hiện tại",
  },
  {
    title: "Hướng dẫn CRM",
    label: "Tính năng chính",
    prompt: "Hướng dẫn các tính năng chính của hệ thống CRM",
  },
]);

export function ChatbotPage() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    seedMockDemoIfNeeded();
  }, []);

  const runtime = usePersistentChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/chat",
    }),
  });

  const aui = useAui({
    suggestions: CRM_SUGGESTIONS,
  });

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      <div className="claude-chat">
        <ChatShell
          sidebarExpanded={sidebarExpanded}
          sidebar={
            <ChatSidebar
              open={mobileSidebarOpen}
              onOpenChange={setMobileSidebarOpen}
              onCollapse={() => setSidebarExpanded(false)}
            />
          }
        >
          <header
            className={`flex items-center gap-2 border-b border-(--claude-border) bg-(--claude-bg)/80 px-4 py-3 backdrop-blur-sm ${sidebarExpanded ? "md:hidden" : ""}`}
          >
            <ChatSidebarToggle
              onClick={() => {
                setSidebarExpanded(true);
                setMobileSidebarOpen(true);
              }}
            />
            <div className="flex min-w-0 items-center gap-2 md:mx-auto">
              <span className="truncate text-[15px] font-medium text-(--claude-text)">
                CRM Chatbot
              </span>
            </div>
          </header>
          <main className="min-h-0 flex-1">
            <Thread />
          </main>
        </ChatShell>
      </div>
    </AssistantRuntimeProvider>
  );
}
