"use client";

import { ChatShell, ChatSidebar, ChatSidebarToggle } from "@/components/chatbot/chat-sidebar";
import { Thread } from "@/components/assistant-ui/thread";
import { usePersistentChatRuntime } from "@/hooks/usePersistentChatRuntime";
import { AssistantRuntimeProvider, useAui, WebSpeechDictationAdapter } from "@assistant-ui/react";
import { AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { EmbedAuthBridge } from "@/components/embed/embed-auth-bridge";
import { cn } from "@/lib/utils";
import { Maximize2Icon } from "lucide-react";
import { lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { useMemo, useState } from "react";

type ChatbotPageProps = {
  embedded?: boolean;
  popover?: boolean;
  fullscreen?: boolean;
  onExpand?: () => void;
  studentId?: string;
};

export function ChatbotPage({
  embedded = false,
  popover = false,
  fullscreen = false,
  onExpand,
  studentId,
}: ChatbotPageProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const showHistorySidebar = Boolean(studentId) || (!popover && (!fullscreen || !embedded));

  const handleExpand = () => {
    if (onExpand) {
      onExpand();
      return;
    }

    if (typeof window === "undefined") return;

    if (window.parent !== window) {
      let targetOrigin = "*";
      if (document.referrer) {
        try {
          targetOrigin = new URL(document.referrer).origin;
        } catch {
          // Keep the wildcard fallback when the referrer is not a valid URL.
        }
      }

      window.parent.postMessage({ type: "crm-chatbot:expand" }, targetOrigin);
      return;
    }

    const fullscreenUrl = process.env.NEXT_PUBLIC_EMBED_FULLSCREEN_URL?.trim();
    if (fullscreenUrl) window.location.assign(fullscreenUrl);
  };

  const transport = useMemo(
    () => new AssistantChatTransport({
      api: studentId
        ? `/api/chat?student_id=${encodeURIComponent(studentId)}`
        : "/api/chat",
    }),
    [studentId],
  );
  const runtime = usePersistentChatRuntime({
    transport,
    // Sau khi duyệt/từ chối một thao tác, gửi lại để trợ lý chạy tiếp.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    adapters: {
      dictation: new WebSpeechDictationAdapter({ language: "vi-VN" }),
    },
  }, studentId);

  const aui = useAui();

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      {embedded ? <EmbedAuthBridge /> : null}
      <div className={cn("claude-chat overflow-hidden", embedded ? "h-full" : "h-dvh")}>
        <ChatShell
          embedded={embedded}
          showSidebar={showHistorySidebar}
          sidebarExpanded={sidebarExpanded}
          sidebar={
            <ChatSidebar
              open={mobileSidebarOpen}
              onOpenChange={setMobileSidebarOpen}
              collapsed={!sidebarExpanded}
              onExpand={() => setSidebarExpanded(true)}
              onCollapse={() => setSidebarExpanded(false)}
              allowArchive={!studentId}
            />
          }
        >
          <header className="sticky top-0 z-20 flex shrink-0 items-center gap-2 border-b border-(--claude-border) bg-(--claude-bg) px-4 py-3 md:hidden">
            {popover ? (
              <button
                type="button"
                onClick={handleExpand}
                aria-label="Mở rộng chatbot"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[var(--claude-muted)] transition-colors hover:bg-[#f3f4f6] hover:text-[var(--claude-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--claude-accent)]"
              >
                <Maximize2Icon className="size-4" />
              </button>
            ) : showHistorySidebar ? (
              <ChatSidebarToggle onClick={() => setMobileSidebarOpen(true)} />
            ) : null}
            <div className="flex min-w-0 items-center gap-2 md:mx-auto">
              <span className="truncate text-[15px] font-medium text-(--claude-text)">Fpilot</span>
            </div>
          </header>
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Thread />
          </main>
        </ChatShell>
      </div>
    </AssistantRuntimeProvider>
  );
}
