"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAui,
  useAuiState,
  useAssistantRuntime,
} from "@assistant-ui/react";
import {
  ArrowLeftIcon,
  HistoryIcon,
  LoaderCircleIcon,
  Maximize2Icon,
  SquarePenIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const HEADER_BUTTON =
  "size-11 min-[480px]:size-9 shrink-0 rounded-lg text-(--claude-muted) hover:bg-(--claude-card) hover:text-(--claude-text)";

type PopoverChatProps = {
  onExpand: () => void;
  listError: string | null;
  waitForThreadLoad: (remoteId: string, liveMessages?: boolean) => Promise<string | null>;
};

export function PopoverChat({ onExpand, listError, waitForThreadLoad }: PopoverChatProps) {
  const aui = useAui();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const isLoading = useAuiState((s) => s.thread.isLoading);
  const isDictating = useAuiState((s) => s.composer.dictation != null);
  const chatRef = useRef<HTMLDivElement>(null);
  const historyButtonRef = useRef<HTMLButtonElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const busy = isRunning || isLoading || switching || isDictating;

  useEffect(() => {
    if (historyOpen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = chatRef.current?.animate(
      [
        { opacity: 0, transform: "translateX(-12px)" },
        { opacity: 1, transform: "translateX(0)" },
      ],
      { duration: 200, easing: "ease-out" }
    );
    return () => animation?.cancel();
  }, [historyOpen]);

  const focusComposer = () => {
    requestAnimationFrame(() =>
      chatRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus()
    );
  };

  const showChat = () => {
    setHistoryOpen(false);
    requestAnimationFrame(() => historyButtonRef.current?.focus());
  };

  const openHistory = () => {
    setHistoryOpen(true);
    setActionError(null);
    void aui.threads().reload();
    requestAnimationFrame(() => backButtonRef.current?.focus());
  };

  const createThread = async () => {
    if (busy) return;
    setSwitching(true);
    setActionError(null);
    setMessageError(null);
    try {
      await aui.threads().switchToNewThread();
      setHistoryOpen(false);
      focusComposer();
    } catch {
      setActionError("Không tạo được cuộc trò chuyện. Vui lòng thử lại.");
    } finally {
      setSwitching(false);
    }
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-1 border-b border-(--claude-border) bg-(--claude-bg) pl-3 pr-14">
        <TooltipIconButton
          ref={backButtonRef}
          tooltip={historyOpen ? "Quay lại cuộc trò chuyện" : "Mở rộng chatbot"}
          aria-label={historyOpen ? "Quay lại cuộc trò chuyện" : "Mở rộng chatbot"}
          onClick={historyOpen ? showChat : onExpand}
          className={HEADER_BUTTON}
        >
          {historyOpen ? (
            <ArrowLeftIcon className="size-4" />
          ) : (
            <Maximize2Icon className="size-4" />
          )}
        </TooltipIconButton>
        <span
          key={String(historyOpen)}
          className="chat-view-enter min-w-0 flex-1 truncate text-[15px] font-medium text-(--claude-text)"
        >
          {historyOpen ? "Lịch sử trò chuyện" : "Fpilot"}
        </span>
        <TooltipIconButton
          tooltip="Cuộc trò chuyện mới"
          aria-label="Cuộc trò chuyện mới"
          disabled={busy}
          onClick={() => void createThread()}
          className={HEADER_BUTTON}
        >
          <SquarePenIcon className="size-4" />
        </TooltipIconButton>
        <TooltipIconButton
          ref={historyButtonRef}
          tooltip="Lịch sử trò chuyện"
          aria-label="Lịch sử trò chuyện"
          aria-pressed={historyOpen}
          onClick={historyOpen ? showChat : openHistory}
          className={cn(HEADER_BUTTON, historyOpen && "bg-(--claude-card) text-(--claude-text)")}
        >
          <HistoryIcon className="size-4" />
        </TooltipIconButton>
      </header>
      {actionError && (
        <p role="alert" className="px-4 py-2 text-sm text-(--claude-text)">
          {actionError}
        </p>
      )}
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Keep the composer and viewport mounted so history never clears a draft. */}
        <div
          ref={chatRef}
          hidden={historyOpen}
          className={cn("h-full min-h-0", historyOpen && "hidden")}
        >
          {messageError ? (
            <div
              role="alert"
              className="flex flex-col items-center gap-3 px-4 py-8 text-center text-sm text-(--claude-muted)"
            >
              <p>{messageError}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Tải lại trang
              </Button>
            </div>
          ) : null}
          <div className={cn("h-full", messageError && "hidden")}>
            <Thread compact />
          </div>
        </div>
        {historyOpen && (
          <div
            className="chat-view-enter flex h-full min-h-0 flex-col"
            style={{ "--chat-enter-x": "12px" } as React.CSSProperties}
          >
            <PopoverHistory
              disabled={busy}
              error={listError || actionError || messageError}
              onError={setActionError}
              waitForThreadLoad={waitForThreadLoad}
              onMessageError={setMessageError}
              messageError={messageError}
              onSwitchingChange={setSwitching}
              onSelected={() => {
                setHistoryOpen(false);
                focusComposer();
              }}
            />
          </div>
        )}
      </main>
    </>
  );
}

function PopoverHistory({
  disabled,
  error,
  onSelected,
  onError,
  waitForThreadLoad,
  onMessageError,
  messageError,
  onSwitchingChange,
}: {
  disabled: boolean;
  error: string | null;
  onSelected: () => void;
  onError: (error: string | null) => void;
  waitForThreadLoad: (remoteId: string, liveMessages?: boolean) => Promise<string | null>;
  onMessageError: (error: string | null) => void;
  messageError: string | null;
  onSwitchingChange: (switching: boolean) => void;
}) {
  const aui = useAui();
  const runtime = useAssistantRuntime();
  const loading = useAuiState((s) => s.threads.isLoading);
  const count = useAuiState((s) => s.threads.threadIds.length);
  const [selecting, setSelecting] = useState(false);

  const generation = useRef(0);
  const stopWaiting = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      generation.current++;
      stopWaiting.current?.();
      onSwitchingChange(false);
    },
    [onSwitchingChange]
  );

  const select = async (id: string, remoteId: string | undefined) => {
    if (disabled || selecting) return;
    const operation = ++generation.current;
    setSelecting(true);
    onSwitchingChange(true);
    onError(null);
    onMessageError(null);
    try {
      let liveMessages = false;
      try {
        const target = runtime.threads.getById(id).getState();
        liveMessages = !target.isLoading && target.messages.length > 0;
      } catch {
        // An unopened thread has no mounted runtime yet; its adapter must load it.
      }
      const loadResult = remoteId
        ? waitForThreadLoad(remoteId, liveMessages)
        : Promise.resolve(null);
      await aui.threads().switchToThread(id);
      const loadError = await loadResult;
      const thread = runtime.thread;
      if (thread.getState().isLoading) {
        await new Promise<void>((resolve) => {
          const unsubscribe = thread.subscribe(() => {
            if (!thread.getState().isLoading) {
              unsubscribe();
              resolve();
            }
          });
          stopWaiting.current = () => {
            unsubscribe();
            resolve();
          };
        });
      }
      stopWaiting.current = null;
      if (operation !== generation.current) return;
      onMessageError(loadError);
      if (!loadError) onSelected();
    } catch {
      onError("Không mở được cuộc trò chuyện. Vui lòng thử lại.");
    } finally {
      if (operation === generation.current) {
        setSelecting(false);
        onSwitchingChange(false);
      }
    }
  };

  return (
    <ThreadListPrimitive.Root
      aria-label="Danh sách cuộc trò chuyện"
      className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
    >
      {error && (
        <div
          role="alert"
          className="mb-3 rounded-lg bg-(--claude-card) p-3 text-sm text-(--claude-muted)"
        >
          <p>{error}</p>
          <Button
            variant="ghost"
            className="mt-2"
            disabled={loading || selecting}
            onClick={() => {
              onError(null);
              if (messageError) window.location.reload();
              else void aui.threads().reload();
            }}
          >
            {messageError ? "Tải lại trang" : "Thử lại"}
          </Button>
        </div>
      )}
      {selecting && (
        <p
          role="status"
          className="mb-2 flex items-center gap-2 px-2 text-sm text-(--claude-muted)"
        >
          <LoaderCircleIcon className="size-4 animate-spin" />
          Đang mở cuộc trò chuyện...
        </p>
      )}
      {loading ? (
        <div role="status" aria-label="Đang tải lịch sử trò chuyện" className="space-y-3 px-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      ) : count === 0 && !error ? (
        <p className="px-2 py-8 text-center text-sm text-(--claude-muted)">
          Chưa có cuộc trò chuyện nào.
        </p>
      ) : (
        <ThreadListPrimitive.Items>
          {() => <HistoryItem disabled={disabled || selecting || loading} onSelect={select} />}
        </ThreadListPrimitive.Items>
      )}
    </ThreadListPrimitive.Root>
  );
}

function HistoryItem({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (id: string, remoteId: string | undefined) => Promise<void>;
}) {
  const id = useAuiState((s) => s.threadListItem.id);
  const remoteId = useAuiState((s) => s.threadListItem.remoteId);
  const title = useAuiState((s) => s.threadListItem.title || "Cuộc trò chuyện mới");
  const active = useAuiState((s) => s.threads.mainThreadId === s.threadListItem.id);
  return (
    <ThreadListItemPrimitive.Root className="mb-1 rounded-lg hover:bg-(--claude-card) data-active:bg-(--claude-card)">
      <button
        type="button"
        title={title}
        aria-current={active ? "true" : undefined}
        disabled={disabled}
        onClick={() => void onSelect(id, remoteId)}
        className="flex min-h-11 w-full min-w-0 items-center rounded-lg px-3 py-2 text-left text-sm text-(--claude-text) focus-visible:outline-2 focus-visible:outline-(--claude-accent) disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="min-w-0 flex-1 truncate">
          <ThreadListItemPrimitive.Title fallback="Cuộc trò chuyện mới" />
        </span>
      </button>
    </ThreadListItemPrimitive.Root>
  );
}
