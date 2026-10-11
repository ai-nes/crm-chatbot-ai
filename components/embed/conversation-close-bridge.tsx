"use client";

import { useAssistantRuntime, useAuiState } from "@assistant-ui/react";
import { useEffect, useRef, useState } from "react";
import { BrainIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { needsConversationMemory, rememberConversation } from "@/lib/chat/conversation-memory";
import { isAllowedOrigin, getReadyTargetOrigin } from "./embed-auth-bridge";
import { STUDENT_OPENING_GREETING_ACTION } from "@/components/chatbot/student-chat-context";

const TAB_FOCUSABLE_SELECTOR =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe:not([tabindex="-1"]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

export function ConversationCloseBridge({ studentFpilot = false }: { studentFpilot?: boolean }) {
  const runtime = useAssistantRuntime();
  const running = useAuiState((state) => state.thread.isRunning);
  const [request, setRequest] = useState<{ id: string; origin: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<{ id: string; origin: string; waitForGreeting?: boolean } | null>(null);
  const studentFpilotMode = useRef<"expanded" | "minimized">("expanded");
  const saveController = useRef<AbortController | null>(null);
  const activity = useRef(new Set<string>());

  useEffect(() => {
    if (window.parent === window) return;
    const trackActivity = () => {
      const state = runtime.thread.getState();
      const latestUser = state.messages.findLast((message) => message.role === "user");
      if (
        state.isRunning &&
        latestUser?.metadata.custom.assistantAction !== "remember-conversation" &&
        latestUser?.metadata.custom.assistantAction !== STUDENT_OPENING_GREETING_ACTION
      )
        activity.current.add(state.threadId);

      const waitingClose = pending.current;
      if (waitingClose?.waitForGreeting && !state.isRunning) {
        if (
          latestUser?.metadata.custom.assistantAction === STUDENT_OPENING_GREETING_ACTION &&
          !needsConversationMemory(state.messages)
        ) {
          window.parent.postMessage(
            { type: "crm-chatbot:close-approved", requestId: waitingClose.id },
            waitingClose.origin
          );
          pending.current = null;
          activity.current.delete(state.threadId);
        } else {
          waitingClose.waitForGreeting = false;
          setError(null);
          setRequest(waitingClose);
        }
      }
    };
    const stopTracking = runtime.thread.subscribe(trackActivity);
    const handle = (event: MessageEvent<unknown>) => {
      if (event.source !== window.parent || !isAllowedOrigin(event.origin)) return;
      const data = event.data as { type?: unknown; requestId?: unknown; mode?: unknown } | null;
      if (
        studentFpilot &&
        data?.type === "crm-chatbot:student-fpilot-mode" &&
        (data.mode === "expanded" || data.mode === "compact" || data.mode === "minimized")
      ) {
        studentFpilotMode.current = data.mode === "expanded" ? "expanded" : "minimized";
        return;
      }
      if (!data || data.type !== "crm-chatbot:request-close" || typeof data.requestId !== "string")
        return;
      // A repeated host click must not replace an in-flight save's request.
      if (pending.current) {
        window.parent.postMessage(
          { type: "crm-chatbot:close-pending", requestId: data.requestId },
          event.origin
        );
        return;
      }
      const state = runtime.thread.getState();
      const latestUser = state.messages.findLast((message) => message.role === "user");
      if (
        state.isRunning &&
        latestUser?.metadata.custom.assistantAction === STUDENT_OPENING_GREETING_ACTION &&
        !needsConversationMemory(state.messages)
      ) {
        const next = { id: data.requestId, origin: event.origin, waitForGreeting: true };
        pending.current = next;
        window.parent.postMessage(
          { type: "crm-chatbot:close-pending", requestId: data.requestId },
          event.origin
        );
        return;
      }
      if (!activity.current.has(state.threadId) || !needsConversationMemory(state.messages)) {
        window.parent.postMessage(
          { type: "crm-chatbot:close-approved", requestId: data.requestId },
          event.origin
        );
        return;
      }
      const next = { id: data.requestId, origin: event.origin };
      pending.current = next;
      setError(null);
      setRequest(next);
      window.parent.postMessage(
        { type: "crm-chatbot:close-pending", requestId: data.requestId },
        event.origin
      );
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (
        !studentFpilot ||
        studentFpilotMode.current !== "expanded" ||
        event.key !== "Escape" ||
        event.defaultPrevented ||
        document.querySelector('[role="dialog"], [role="alertdialog"]')
      ) {
        return;
      }
      event.preventDefault();
      window.parent.postMessage({ type: "crm-chatbot:host-close-request" }, getReadyTargetOrigin());
    };
    const handleTabBoundary = (event: KeyboardEvent) => {
      if (
        !studentFpilot ||
        studentFpilotMode.current !== "expanded" ||
        event.key !== "Tab" ||
        event.defaultPrevented
      ) {
        return;
      }

      const nestedOverlay = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'
        )
      ).some(
        (element) =>
          element.getClientRects().length > 0 && !element.closest('[aria-hidden="true"], [inert]')
      );
      if (nestedOverlay) return;

      const focusable = Array.from(
        document.querySelectorAll<HTMLElement>(TAB_FOCUSABLE_SELECTOR)
      ).filter(
        (element) =>
          element.tabIndex >= 0 &&
          element.getClientRects().length > 0 &&
          !element.closest('[aria-hidden="true"], [inert]')
      );
      if (focusable.length === 0) return;

      const boundary = event.shiftKey ? focusable[0] : focusable[focusable.length - 1];
      if (document.activeElement !== boundary) return;

      event.preventDefault();
      window.parent.postMessage(
        {
          type: "crm-chatbot:host-tab-boundary",
          direction: event.shiftKey ? "backward" : "forward",
        },
        getReadyTargetOrigin()
      );
    };
    window.addEventListener("message", handle);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("keydown", handleTabBoundary);
    window.parent.postMessage({ type: "crm-chatbot:lifecycle-ready" }, getReadyTargetOrigin());
    return () => {
      window.removeEventListener("message", handle);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("keydown", handleTabBoundary);
      stopTracking();
      saveController.current?.abort();
    };
  }, [runtime, studentFpilot]);

  const dismiss = () => {
    if (saving) return;
    pending.current = null;
    setRequest(null);
    setError(null);
  };
  const approve = () => {
    if (!request) return;
    window.parent.postMessage(
      { type: "crm-chatbot:close-approved", requestId: request.id },
      request.origin
    );
    pending.current = null;
    activity.current.delete(runtime.thread.getState().threadId);
    setRequest(null);
  };
  const saveAndClose = async () => {
    if (saving || running || !request) return;
    setSaving(true);
    setError(null);
    const controller = new AbortController();
    saveController.current = controller;
    try {
      await rememberConversation(runtime, controller.signal);
      if (controller.signal.aborted) return;
      toast.success("Đã ghi nhớ cuộc trò chuyện");
      approve();
    } catch (reason) {
      if (!controller.signal.aborted)
        setError(reason instanceof Error ? reason.message : "Không ghi nhớ được cuộc trò chuyện.");
    } finally {
      if (!controller.signal.aborted) setSaving(false);
    }
  };

  return (
    <AlertDialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) dismiss();
      }}
    >
      <AlertDialogContent className="claude-chat-portal w-[calc(100%-2rem)] max-w-sm rounded-2xl border-(--claude-border) bg-(--claude-surface) p-5">
        <AlertDialogHeader>
          <BrainIcon className="mb-1 size-5 text-(--claude-muted)" />
          <AlertDialogTitle className="text-(--claude-text)">
            Bạn có muốn ghi nhớ cuộc trò chuyện này không?
          </AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed text-(--claude-muted)">
            Fpilot sẽ lưu những thông tin hữu ích để hỗ trợ bạn trong lần trao đổi sau.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        {running && !saving && (
          <p className="text-sm text-(--claude-muted)">
            Fpilot đang trả lời. Bạn có thể chờ để ghi nhớ hoặc đóng cuộc trò chuyện.
          </p>
        )}
        <AlertDialogFooter className="flex-wrap">
          <AlertDialogCancel disabled={saving}>Quay lại</AlertDialogCancel>
          <Button variant="ghost" disabled={saving} onClick={approve}>
            Đóng
          </Button>
          <Button disabled={saving || running} onClick={() => void saveAndClose()}>
            {saving ? "Đang ghi nhớ…" : "Ghi nhớ và đóng"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
