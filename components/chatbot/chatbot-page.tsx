"use client";

import { ChatShell, ChatSidebar, ChatSidebarToggle } from "@/components/chatbot/chat-sidebar";
import { Thread } from "@/components/assistant-ui/thread";
import { PopoverChat } from "@/components/chatbot/popover-history";
import { createThreadLoadTracker, type ThreadLoadObserver } from "@/lib/chat/thread-load-observer";
import { usePersistentChatRuntime } from "@/hooks/usePersistentChatRuntime";
import {
  AssistantRuntimeProvider,
  useAui,
  useAuiState,
  WebSpeechDictationAdapter,
} from "@assistant-ui/react";
import { AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { EmbedAuthBridge } from "@/components/embed/embed-auth-bridge";
import { ConversationCloseBridge } from "@/components/embed/conversation-close-bridge";
import { StudentChatContext } from "@/components/chatbot/student-chat-context";
import { cn } from "@/lib/utils";
import { Maximize2Icon } from "lucide-react";
import { lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { getReadyTargetOrigin, isAllowedOrigin } from "@/components/embed/embed-auth-bridge";

type ChatbotPageProps = {
  embedded?: boolean;
  popover?: boolean;
  fullscreen?: boolean;
  onExpand?: () => void;
  studentId?: string;
};

function createStudentScopedTransport(
  studentScopeRef: MutableRefObject<string | undefined>,
  threadScopesRef: MutableRefObject<Map<string, string | undefined>>,
) {
  return new AssistantChatTransport({
    api: "/api/chat",
    prepareSendMessagesRequest: (options) => {
      const scopedStudentId = threadScopesRef.current.has(options.id)
        ? threadScopesRef.current.get(options.id)
        : studentScopeRef.current;
      const url = new URL(options.api, window.location.origin);
      if (scopedStudentId) url.searchParams.set("student_id", scopedStudentId);
      return {
        api: `${url.pathname}${url.search}`,
        body: {
          ...options.body,
          id: options.id,
          messages: options.messages,
          trigger: options.trigger,
          messageId: options.messageId,
          metadata: options.requestMetadata,
        },
      };
    },
  });
}

function StudentChatContextBridge({
  studentId,
  studentScopeRef,
  threadScopesRef,
  children,
}: {
  studentId?: string;
  studentScopeRef: MutableRefObject<string | undefined>;
  threadScopesRef: MutableRefObject<Map<string, string | undefined>>;
  children: ReactNode;
}) {
  const aui = useAui();
  const threadId = useAuiState((state) => state.threadListItem.id);
  const custom = useAuiState((state) => state.threadListItem.custom);
  const [activeStudentId, setActiveStudentId] = useState(studentId);
  const previousThreadId = useRef(threadId);
  const pendingStudentScope = useRef<{ fromThreadId: string; studentId: string } | null>(null);

  const setScope = useCallback((targetThreadId: string, nextStudentId?: string) => {
    threadScopesRef.current.set(targetThreadId, nextStudentId);
    studentScopeRef.current = nextStudentId;
    setActiveStudentId(nextStudentId);
  }, [studentScopeRef, threadScopesRef]);

  useEffect(() => {
    if (threadId !== previousThreadId.current) {
      const pending = pendingStudentScope.current;
      if (pending && pending.fromThreadId === previousThreadId.current) {
        pendingStudentScope.current = null;
        setScope(threadId, pending.studentId);
      } else if (custom && Object.prototype.hasOwnProperty.call(custom, "studentId")) {
        setScope(threadId, typeof custom.studentId === "string" ? custom.studentId : undefined);
      } else {
        setScope(threadId, studentScopeRef.current);
      }
      previousThreadId.current = threadId;
    } else if (custom && Object.prototype.hasOwnProperty.call(custom, "studentId")) {
      const metadataStudentId = typeof custom.studentId === "string" ? custom.studentId : undefined;
      if (metadataStudentId !== studentScopeRef.current) setScope(threadId, metadataStudentId);
    } else if (studentId && !threadScopesRef.current.has(threadId)) {
      setScope(threadId, studentId);
    }
  }, [custom, setScope, studentId, studentScopeRef, threadId, threadScopesRef]);

  useEffect(() => {
    if (window.parent === window) return;

    const targetOrigin = getReadyTargetOrigin();
    window.parent.postMessage({ type: "crm-chatbot:student-scope-ready" }, targetOrigin);
    const handleMessage = async (event: MessageEvent<unknown>) => {
      if (event.source !== window.parent || !isAllowedOrigin(event.origin)) return;
      const data = event.data as {
        type?: unknown;
        studentId?: unknown;
        requestId?: unknown;
      } | null;
      if (data?.type !== "crm-chatbot:set-student-scope") return;
      if (typeof data.studentId !== "string" || !data.studentId.trim()) {
        window.parent.postMessage(
          { type: "crm-chatbot:student-scope-ack", requestId: data.requestId, ok: false },
          event.origin,
        );
        return;
      }

      const requestedStudentId = data.studentId.trim();
      const threadCustom = aui.threadListItem().getState().custom;
      const currentThreadId = aui.threadListItem().getState().id;
      const hasSavedScope = threadCustom && Object.prototype.hasOwnProperty.call(threadCustom, "studentId");
      const savedStudentId = hasSavedScope && typeof threadCustom.studentId === "string"
        ? threadCustom.studentId
        : undefined;
      const currentScope = hasSavedScope
        ? savedStudentId
        : threadScopesRef.current.has(currentThreadId)
          ? threadScopesRef.current.get(currentThreadId)
          : studentScopeRef.current;

      try {
        if (currentScope && currentScope !== requestedStudentId) {
          pendingStudentScope.current = {
            fromThreadId: currentThreadId,
            studentId: requestedStudentId,
          };
          studentScopeRef.current = requestedStudentId;
          setActiveStudentId(requestedStudentId);
          await aui.threads().switchToNewThread();
        } else {
          setScope(currentThreadId, requestedStudentId);
        }
        window.parent.postMessage(
          {
            type: "crm-chatbot:student-scope-ack",
            requestId: data.requestId,
            ok: true,
            studentId: requestedStudentId,
          },
          event.origin,
        );
      } catch {
        pendingStudentScope.current = null;
        setScope(currentThreadId, currentScope);
        window.parent.postMessage(
          { type: "crm-chatbot:student-scope-ack", requestId: data.requestId, ok: false },
          event.origin,
        );
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [aui, setScope, studentScopeRef, threadScopesRef]);

  return (
    <StudentChatContext.Provider value={{ studentId: activeStudentId }}>
      {children}
    </StudentChatContext.Provider>
  );
}

export function ChatbotPage({
  embedded = false,
  popover = false,
  fullscreen = false,
  onExpand,
  studentId,
}: ChatbotPageProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [hostExpanded, setHostExpanded] = useState(!popover || fullscreen);
  const compactPopover = popover && !hostExpanded;
  const studentScopeRef = useRef(studentId);
  const threadScopesRef = useRef(new Map<string, string | undefined>());
  const [listError, setListError] = useState<string | null>(null);
  const [loadTracker] = useState(createThreadLoadTracker);
  const observeLoad = useCallback<ThreadLoadObserver>(
    (event) => {
      if (event.scope === "list") setListError(event.error);
      else loadTracker.observe(event);
    },
    [loadTracker]
  );
  const showHistorySidebar =
    !compactPopover && (popover || Boolean(studentId) || (!popover && (!fullscreen || !embedded)));

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
    if (studentId) studentScopeRef.current = studentId;
  }, [studentId]);

  useEffect(() => {
    if (!popover || window.parent === window) return;
    const handleMode = (event: MessageEvent<unknown>) => {
      if (event.source !== window.parent || !isAllowedOrigin(event.origin)) return;
      const data = event.data as { type?: unknown; mode?: unknown } | null;
      if (data?.type !== "crm-chatbot:student-fpilot-mode") return;
      setHostExpanded(data.mode === "expanded");
    };
    window.addEventListener("message", handleMode);
    return () => window.removeEventListener("message", handleMode);
  }, [popover]);

  const transport = useMemo(
    // The ref is read by the transport only when a request starts, after render.
    // eslint-disable-next-line react-hooks/refs
    () => createStudentScopedTransport(studentScopeRef, threadScopesRef),
    []
  );
  const runtime = usePersistentChatRuntime(
    {
      transport,
      // Sau khi duyệt/từ chối một thao tác, gửi lại để trợ lý chạy tiếp.
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
      adapters: {
        dictation: new WebSpeechDictationAdapter({ language: "vi-VN" }),
      },
    },
    observeLoad
  );

  const aui = useAui();

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      {embedded ? <EmbedAuthBridge /> : null}
      {embedded ? <ConversationCloseBridge studentFpilot={popover || Boolean(studentId)} /> : null}
      <StudentChatContextBridge
        studentId={studentId}
        studentScopeRef={studentScopeRef}
        threadScopesRef={threadScopesRef}
      >
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
            {compactPopover ? (
              <PopoverChat
                onExpand={handleExpand}
                listError={listError}
                waitForThreadLoad={loadTracker.wait}
              />
            ) : (
              <>
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
                    <span className="truncate text-[15px] font-medium text-(--claude-text)">
                      Fpilot
                    </span>
                  </div>
                </header>
                <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <Thread />
                </main>
              </>
            )}
          </ChatShell>
        </div>
      </StudentChatContextBridge>
    </AssistantRuntimeProvider>
  );
}
