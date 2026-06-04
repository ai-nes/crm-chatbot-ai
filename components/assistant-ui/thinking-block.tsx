"use client";

import { GradualRevealText } from "@/components/assistant-ui/gradual-reveal-text";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import {
  getThinkingTargetPhase,
  hasThinkingInText,
  nextThinkingDisplayPhase,
  parseThinkingFromText,
  sanitizeAssistantText,
  type ThinkingDisplayPhase,
} from "@/lib/chat/parse-thinking";
import { useMessagePartText, useAuiState } from "@assistant-ui/react";
import { BrainIcon } from "lucide-react";
import { memo, useEffect, useMemo, useState, type FC } from "react";
import { cn } from "@/lib/utils";

const PHASE_MS = 280;
const THINKING_LABEL = "Suy nghĩ";
const THINKING_LABEL_CHARS = [...THINKING_LABEL];
/** Một vòng sóng S→…→i; ~1.5s thay vì 2.4s */
const GLOW_CYCLE_S = 1.5;
const GLOW_CHAR_STAGGER_S = GLOW_CYCLE_S / THINKING_LABEL_CHARS.length;

const DEFAULT_SKELETON_WIDTHS = [92, 78, 64] as const;

const phasePanelClass = (
  active: boolean,
  exiting: boolean,
  forceOpen: boolean,
) =>
  cn(
    "grid transition-[grid-template-rows,opacity,transform] duration-(--thinking-phase-ms) ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
    forceOpen || active || exiting ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
    forceOpen || (active && !exiting)
      ? "translate-y-0 opacity-100"
      : exiting
        ? "-translate-y-1 opacity-0"
        : "translate-y-1 opacity-0",
    !forceOpen && !active && !exiting && "pointer-events-none",
  );

/** Header cố định — glow lặp từng ký tự: S → u → y → … → i */
const ThinkingHeaderLoop: FC<{ loop: boolean }> = ({ loop }) => (
  <div
    data-slot="aui_thinking-header"
    className="mb-1.5 flex isolate items-center gap-2 text-xs font-medium"
  >
    <BrainIcon
      className={cn(
        "size-3.5 shrink-0",
        loop ? "aui-thinking-brain-glow" : "text-(--claude-muted) opacity-80",
      )}
      style={
        loop
          ? {
              animationDuration: `${GLOW_CYCLE_S}s`,
            }
          : undefined
      }
      aria-hidden
    />
    <span
      className="inline-flex items-baseline [text-shadow:none]"
      aria-label={THINKING_LABEL}
    >
      {THINKING_LABEL_CHARS.map((char, index) => (
        <span
          key={`${char}-${index}`}
          className={cn(
            "inline-block min-w-[0.2em]",
            loop ? "aui-thinking-glow-token" : "text-(--claude-muted)",
          )}
          style={
            loop
              ? {
                  animationDelay: `${index * GLOW_CHAR_STAGGER_S}s`,
                  animationDuration: `${GLOW_CYCLE_S}s`,
                }
              : undefined
          }
        >
          {char === " " ? "\u00a0" : char}
        </span>
      ))}
    </span>
  </div>
);

const ThinkingPlaceholderSkeleton: FC = () => (
  <div
    data-slot="aui_thinking-text-skeleton"
    className="space-y-2.5 py-0.5"
    aria-hidden
  >
    {DEFAULT_SKELETON_WIDTHS.map((width, i) => (
      <div
        key={width}
        className="aui-thinking-skeleton-bar h-3.5 rounded-full"
        style={{
          width: `${width}%`,
          animationDelay: `${i * 120}ms`,
        }}
      />
    ))}
  </div>
);

const ThinkingTextBody: FC<{ text: string; isBusy: boolean }> = ({
  text,
  isBusy,
}) => {
  if (!text.trim() && isBusy) {
    return <ThinkingPlaceholderSkeleton />;
  }

  return (
    <p
      data-slot="aui_thinking-text"
      className="text-sm leading-relaxed text-(--claude-muted)"
    >
      <GradualRevealText
        text={text}
        by="word"
        active={isBusy}
        tokenDelayMs={28}
      />
    </p>
  );
};

export const ThinkingContentPanel: FC<{
  text: string;
  isBusy: boolean;
  isExiting?: boolean;
}> = ({ text, isBusy, isExiting = false }) => (
  <div
    data-slot="aui_thinking-content"
    className={cn(
      "aui-thinking-panel relative overflow-hidden rounded-lg border border-(--claude-border-subtle) bg-(--claude-card)/60 px-3 py-2.5 ps-4",
      isExiting && "aui-thinking-panel--exit",
    )}
    aria-busy={isBusy}
  >
    <ThinkingHeaderLoop loop={isBusy} />
    <ThinkingTextBody text={text} isBusy={isBusy} />
  </div>
);

/** Hiện ngay sau khi gửi (trước khi có text stream part). */
export const ThinkingPanelImmediate: FC<React.ComponentProps<"div">> = ({
  className,
  ...props
}) => (
  <div className={className} {...props}>
    <ThinkingContentPanel text="" isBusy />
  </div>
);

export const ThinkingLoading: FC<React.ComponentProps<"div">> = ({
  className,
  ...props
}) => (
  <div
    data-slot="aui_thinking-loading"
    className={cn("aui-thinking-loading", className)}
    aria-live="polite"
    aria-busy="true"
    {...props}
  >
    <ThinkingPanelImmediate />
  </div>
);

const AssistantTextWithThinking: FC = () => {
  const { text } = useMessagePartText();
  const isRunning = useAuiState((s) => s.message.status?.type === "running");

  const parsed = useMemo(() => parseThinkingFromText(text), [text]);
  const targetPhase = useMemo(
    () => getThinkingTargetPhase(parsed, isRunning),
    [parsed, isRunning],
  );

  const [displayPhase, setDisplayPhase] = useState<ThinkingDisplayPhase>(() =>
    parsed.thinking.trim() ? "thinking" : "loading",
  );
  const [exitingPhase, setExitingPhase] = useState<ThinkingDisplayPhase | null>(
    null,
  );
  const [animatePhases, setAnimatePhases] = useState(isRunning);

  useEffect(() => {
    if (isRunning) {
      setAnimatePhases(true);
      return;
    }
    if (!animatePhases) {
      setDisplayPhase(targetPhase);
      setExitingPhase(null);
    }
  }, [isRunning, animatePhases, targetPhase]);

  useEffect(() => {
    if (!animatePhases) return;
    if (displayPhase === targetPhase) {
      setExitingPhase(null);
      return;
    }

    const next = nextThinkingDisplayPhase(displayPhase, targetPhase);
    if (!next) {
      setDisplayPhase(targetPhase);
      setExitingPhase(null);
      return;
    }

    const skipDelay =
      displayPhase === "loading" &&
      next === "thinking" &&
      parsed.thinking.trim().length > 0;
    const delay = skipDelay ? 100 : PHASE_MS;

    setExitingPhase(displayPhase);
    const timer = window.setTimeout(() => {
      setDisplayPhase(next);
      setExitingPhase(null);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [animatePhases, displayPhase, targetPhase, parsed.thinking]);

  useEffect(() => {
    if (!isRunning && animatePhases && displayPhase === targetPhase) {
      setAnimatePhases(false);
    }
  }, [animatePhases, displayPhase, isRunning, targetPhase]);

  const showAnswer = displayPhase === "answer";
  const showThinkingPanel = !showAnswer;
  const panelActive =
    displayPhase === "loading" || displayPhase === "thinking";
  const panelExiting =
    exitingPhase === "loading" || exitingPhase === "thinking";
  const isPanelBusy = isRunning && !showAnswer;
  const forcePanelOpen = isRunning && showThinkingPanel;

  return (
    <div
      data-slot="aui_assistant-text-thinking"
      className="flex flex-col gap-2"
      style={{ "--thinking-phase-ms": `${PHASE_MS}ms` } as React.CSSProperties}
    >
      {showThinkingPanel ? (
        <div
          className={phasePanelClass(panelActive, panelExiting, forcePanelOpen)}
        >
          <div className="min-h-0 overflow-hidden">
            <ThinkingContentPanel
              text={parsed.thinking}
              isBusy={isPanelBusy}
              isExiting={panelExiting}
            />
          </div>
        </div>
      ) : null}

      {showAnswer ? (
        <div
          data-slot="aui_assistant-text-answer"
          className="fade-in slide-in-from-bottom-2 zoom-in-95 animate-in fill-mode-both duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        >
          <MarkdownText preprocess={sanitizeAssistantText} />
        </div>
      ) : null}
    </div>
  );
};

const AssistantTextImpl: FC = () => {
  const { text } = useMessagePartText();
  const isRunning = useAuiState((s) => s.message.status?.type === "running");
  const useThinkingFlow = isRunning || hasThinkingInText(text);

  if (!useThinkingFlow) {
    return <MarkdownText preprocess={sanitizeAssistantText} />;
  }

  return <AssistantTextWithThinking />;
};

export const AssistantText = memo(AssistantTextImpl);

export const AssistantPendingIndicator: FC = () => {
  const hasTextPart = useAuiState((s) =>
    s.message.parts.some((p) => p.type === "text"),
  );
  if (hasTextPart) return null;
  return (
    <ThinkingPanelImmediate
      data-slot="aui_assistant-message-indicator"
      aria-label="Assistant is working"
    />
  );
};
