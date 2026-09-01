"use client";

import { useEffect, useState } from "react";
import { ChatbotPage } from "@/components/chatbot/chatbot-page";
import { cn } from "@/lib/utils";
import { MessageCircleIcon, Minimize2Icon, XIcon } from "lucide-react";

const POPOVER_STATE_MESSAGE = "crm-chatbot:popover-state";
const FULLSCREEN_URL = process.env.NEXT_PUBLIC_EMBED_FULLSCREEN_URL?.trim();

function notifyParent(open: boolean, expanded: boolean) {
  if (typeof window === "undefined" || window.parent === window) return;

  window.parent.postMessage(
    { type: POPOVER_STATE_MESSAGE, open, expanded },
    getParentTargetOrigin()
  );
}

function getParentTargetOrigin() {
  if (typeof document !== "undefined" && document.referrer) {
    try {
      return new URL(document.referrer).origin;
    } catch {
      // Fall back to a wildcard for parent pages that hide their referrer.
    }
  }

  return "*";
}

function openFullscreen(setExpanded: (expanded: boolean) => void) {
  if (FULLSCREEN_URL) {
    if (window.top && window.top !== window) {
      window.top.location.href = FULLSCREEN_URL;
    } else {
      window.location.href = FULLSCREEN_URL;
    }
    return;
  }

  setExpanded(true);
}

export function PopoverChatbot() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    notifyParent(open, expanded);
  }, [expanded, open]);

  return (
    <div
      className={cn(
        "chatbot-popover-root box-border flex h-full max-h-full w-full max-w-full items-end justify-end overflow-hidden",
        expanded ? "p-0" : "p-3 sm:p-4"
      )}
    >
      <div
        aria-hidden={!open}
        className={cn(
          "relative box-border max-h-full max-w-full origin-bottom-right overflow-hidden bg-[var(--claude-bg)] transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none",
          expanded
            ? "h-full w-full rounded-none shadow-none"
            : "h-[min(680px,100%)] w-[min(420px,100%)] rounded-2xl shadow-[0_10px_30px_rgba(26,25,21,0.18)]",
          open
            ? "visible translate-y-0 opacity-100"
            : "invisible pointer-events-none translate-y-2 opacity-0"
        )}
      >
        <ChatbotPage
          embedded
          fullscreen={expanded}
          popover
          onExpand={() => openFullscreen(setExpanded)}
        />
        {expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Thu nhỏ chatbot"
            className="absolute right-12 top-3 z-30 inline-flex size-8 items-center justify-center rounded-full bg-[rgba(245,244,239,0.94)] text-[var(--claude-muted)] shadow-[0_2px_8px_rgba(26,25,21,0.14)] transition-colors hover:bg-white hover:text-[var(--claude-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--claude-accent)]"
          >
            <Minimize2Icon className="size-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setExpanded(false);
          }}
          aria-label="Đóng chatbot"
          className="absolute right-3 top-3 z-30 inline-flex size-8 items-center justify-center rounded-full bg-[rgba(245,244,239,0.94)] text-[var(--claude-muted)] shadow-[0_2px_8px_rgba(26,25,21,0.14)] transition-colors hover:bg-white hover:text-[var(--claude-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--claude-accent)]"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Mở CRM Chatbot"
          className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--claude-accent)] text-white shadow-[0_8px_20px_rgba(26,25,21,0.2)] transition-[background-color,transform] duration-200 ease-out hover:scale-[1.03] hover:bg-[var(--claude-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--claude-accent)] motion-reduce:transition-none motion-reduce:hover:scale-100"
        >
          <MessageCircleIcon className="size-6" />
        </button>
      ) : null}
    </div>
  );
}
