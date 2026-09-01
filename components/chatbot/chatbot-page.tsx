"use client";

import { ChatShell, ChatSidebar, ChatSidebarToggle } from "@/components/chatbot/chat-sidebar";
import { Thread } from "@/components/assistant-ui/thread";
import { usePersistentChatRuntime } from "@/hooks/usePersistentChatRuntime";
import { AssistantRuntimeProvider, useAui, WebSpeechDictationAdapter } from "@assistant-ui/react";
import { AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { pickLatestUserMessageForUpstream } from "@/lib/chat/upstream-messages";
import { seedMockDemoIfNeeded } from "@/lib/chat/seed-mock-demo";
import { EmbedAuthBridge } from "@/components/embed/embed-auth-bridge";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAuthToken } from "@/lib/redux/slices/authSlice";
import { Maximize2Icon } from "lucide-react";
import type { UIMessage } from "ai";
import { useEffect, useState } from "react";

type ChatbotPageProps = {
  embedded?: boolean;
  popover?: boolean;
  fullscreen?: boolean;
  onExpand?: () => void;
};

export function ChatbotPage({
  embedded = false,
  popover = false,
  fullscreen = false,
  onExpand,
}: ChatbotPageProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const authToken = useAppSelector(selectAuthToken);
  const showHistorySidebar = !fullscreen && !popover;

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

  useEffect(() => {
    seedMockDemoIfNeeded();
  }, []);

  const runtime = usePersistentChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/chat",
      fetch: async (input, init) => {
        const headers = new Headers(init?.headers);
        if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

        if (init?.body && typeof init.body === "string") {
          const parsed = JSON.parse(init.body) as {
            messages?: UIMessage[];
          };
          const latest = parsed.messages ? pickLatestUserMessageForUpstream(parsed.messages) : null;
          if (latest) {
            init = {
              ...init,
              headers,
              body: JSON.stringify({ ...parsed, messages: [latest] }),
            };
          }
        }

        return fetch(input, { ...init, headers });
      },
    }),
    adapters: {
      dictation: new WebSpeechDictationAdapter({ language: "vi-VN" }),
    },
  });

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
