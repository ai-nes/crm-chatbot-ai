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
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import { memo, useEffect, useMemo, useState, type FC } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const PHASE_MS = 280;
const THINKING_LABEL = "Đang suy nghĩ";
/** Một vòng glow lặp qua từng ký tự; ~1.5s thay vì 2.4s */
const GLOW_CYCLE_S = 1.5;

const DEFAULT_SKELETON_WIDTHS = [92, 78, 64] as const;

export type AgentActivity = {
  activity_id?: string;
  event?: string;
  phase: string;
  status?: string;
  tool?: string;
  resource?: string;
  summary?: string;
  navigation_reason?: string;
  evidence_count?: number;
};

export type AgentReasoning = AgentActivity & {
  reasoning?: {
    observed?: string;
    analysis?: string;
    implication?: string;
    uncertainty?: string;
    next_step?: string;
  };
};

type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord | null =>
  typeof value === "object" && value !== null ? (value as JsonRecord) : null;

const asOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const asOptionalNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const isDataPart = (record: JsonRecord | null, name: string) =>
  record?.type === `data-${name}` || (record?.type === "data" && record.name === name);

function readCommonAgentEvent(data: unknown): AgentActivity | null {
  const record = asRecord(data);
  const phase = asOptionalString(record?.phase) ?? asOptionalString(record?.event);
  if (!record || !phase) return null;

  return {
    activity_id: asOptionalString(record.activity_id),
    event: asOptionalString(record.event),
    phase,
    status: asOptionalString(record.status),
    tool: asOptionalString(record.tool),
    resource: asOptionalString(record.resource),
    summary: asOptionalString(record.summary),
    navigation_reason: asOptionalString(record.navigation_reason),
    evidence_count: asOptionalNumber(record.evidence_count),
  };
}

export function readAgentActivityPart(part: unknown): AgentActivity | null {
  const record = asRecord(part);
  return record && isDataPart(record, "agent-activity") ? readCommonAgentEvent(record.data) : null;
}

export function readAgentReasoningPart(part: unknown): AgentReasoning | null {
  const record = asRecord(part);
  if (!record || !isDataPart(record, "agent-reasoning")) return null;

  const event = readCommonAgentEvent(record.data);
  const data = asRecord(record.data);
  const reasoning = asRecord(data?.reasoning);
  if (!event) return null;

  return {
    ...event,
    reasoning: reasoning
      ? {
          observed: asOptionalString(reasoning.observed),
          analysis: asOptionalString(reasoning.analysis),
          implication: asOptionalString(reasoning.implication),
          uncertainty: asOptionalString(reasoning.uncertainty),
          next_step: asOptionalString(reasoning.next_step),
        }
      : undefined,
  };
}

const phasePanelClass = (active: boolean, exiting: boolean, forceOpen: boolean) =>
  cn(
    "grid transition-[grid-template-rows,opacity,transform] duration-(--thinking-phase-ms) ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
    forceOpen || active || exiting ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
    forceOpen || (active && !exiting)
      ? "translate-y-0 opacity-100"
      : exiting
        ? "-translate-y-1 opacity-0"
        : "translate-y-1 opacity-0",
    !forceOpen && !active && !exiting && "pointer-events-none"
  );

/** Header cố định với hiệu ứng glow lặp qua từng ký tự. */
const ThinkingHeaderLoop: FC<{
  loop: boolean;
  label?: string;
  className?: string;
}> = ({ loop, label = THINKING_LABEL, className }) => {
  const labelChars = [...label];
  const charStagger = GLOW_CYCLE_S / Math.max(labelChars.length, 1);

  return (
    <span
      data-slot="aui_thinking-header"
      className={cn("flex min-w-0 items-center gap-2 text-xs font-medium", className)}
    >
      <BrainIcon
        className={cn(
          "size-3.5 shrink-0",
          loop ? "aui-thinking-brain-glow" : "text-(--claude-muted) opacity-80"
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
      <span className="inline-flex items-baseline [text-shadow:none]" aria-label={label}>
        {labelChars.map((char, index) => (
          <span
            key={`${char}-${index}`}
            className={cn(
              "inline-block min-w-[0.2em]",
              loop ? "aui-thinking-glow-token" : "text-(--claude-muted)"
            )}
            style={
              loop
                ? {
                    animationDelay: `${index * charStagger}s`,
                    animationDuration: `${GLOW_CYCLE_S}s`,
                  }
                : undefined
            }
          >
            {char === " " ? "\u00a0" : char}
          </span>
        ))}
      </span>
    </span>
  );
};

const ThinkingPlaceholderSkeleton: FC = () => (
  <div data-slot="aui_thinking-text-skeleton" className="space-y-2.5 py-0.5" aria-hidden>
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

const ThinkingTextBody: FC<{ text: string; isBusy: boolean }> = ({ text, isBusy }) => {
  if (!text.trim() && isBusy) {
    return <ThinkingPlaceholderSkeleton />;
  }

  return (
    <p data-slot="aui_thinking-text" className="text-sm leading-relaxed text-(--claude-muted)">
      <GradualRevealText text={text} by="word" active={isBusy} tokenDelayMs={28} />
    </p>
  );
};

export const ThinkingContentPanel: FC<{
  text: string;
  isBusy: boolean;
  isExiting?: boolean;
  activities?: readonly AgentActivity[];
  reasonings?: readonly AgentReasoning[];
  label?: string;
}> = ({ text, isBusy, isExiting = false, activities = [], reasonings = [], label }) => {
  const hasEvents = activities.length > 0 || reasonings.length > 0;

  return (
    <div
      data-slot="aui_thinking-content"
      className={cn(
        "aui-thinking-panel relative overflow-hidden rounded-lg border border-(--claude-border-subtle) bg-(--claude-card)/60 px-3 py-2.5 ps-4",
        isExiting && "aui-thinking-panel--exit"
      )}
      aria-busy={isBusy}
    >
      <ThinkingHeaderLoop loop={isBusy} label={label} className="mb-1.5" />
      {hasEvents ? <ThinkingActivityList activities={activities} reasonings={reasonings} /> : null}
      {text.trim() || !hasEvents ? <ThinkingTextBody text={text} isBusy={isBusy} /> : null}
    </div>
  );
};

const RESOURCE_LABELS: Record<string, string> = {
  "admissions_analytics.pipeline_summary.read": "pipeline tuyển sinh",
  "sales_intelligence.worklist.read": "worklist tư vấn",
  "knowledge_graph.query": "tri thức tuyển sinh",
  "school360.overview.read:v1": "hồ sơ học sinh 360°",
  "school360.recommendation.context.read:v1": "ngữ cảnh khuyến nghị",
  "CRM Admission Application": "đơn tuyển sinh",
  "CRM Admission Year": "năm tuyển sinh",
  "CRM Campaign Funnel Metric": "chỉ số phễu tuyển sinh",
  "CRM Contact": "liên hệ",
  "CRM Interaction": "tương tác",
  "CRM Intent": "ý định tuyển sinh",
  "CRM Student": "hồ sơ học sinh",
};

const formatResource = (resource?: string) => {
  if (!resource) return "dữ liệu CRM";
  return RESOURCE_LABELS[resource] ?? resource.replace(/[._:]+/g, " ");
};

const formatActivityLabel = (activity: AgentActivity, completed = false): string => {
  const graphEventLabel: Record<string, string> = {
    "analysis.started": "Đang bắt đầu phân tích hồ sơ",
    "resource.selected": "Đã chọn nguồn dữ liệu phù hợp",
    "tool.started": "Đang tra cứu dữ liệu CRM",
    "tool.completed": "Đã tra cứu xong dữ liệu CRM",
    "analysis.assessment": "Đang đánh giá bằng chứng",
    "analysis.synthesis.started": "Đang tổng hợp bản phân tích",
    "analysis.completed": "Đã hoàn tất phân tích hồ sơ",
  };

  if (activity.event && graphEventLabel[activity.event]) {
    return graphEventLabel[activity.event];
  }
  if (activity.summary) return activity.summary;

  const resource = formatResource(activity.resource);
  if (activity.phase === "resource_selected") {
    return `${completed ? "Đã chọn" : "Đang chọn"} ${resource}`;
  }
  if (activity.phase === "tool_start") {
    return `${completed ? "Đã tra cứu" : "Đang tra cứu"} ${resource}`;
  }
  if (activity.phase === "tool_end") return `Đã tra cứu ${resource}`;
  if (activity.phase === "evidence_summary") return "Đã tổng hợp bằng chứng CRM";
  if (activity.phase === "action_policy") return "Đang kiểm tra chính sách hành động";
  if (activity.phase === "action_approval") return "Đang kiểm tra yêu cầu phê duyệt";
  if (activity.phase === "action_execution") return "Đang thực hiện hành động CRM";
  if (activity.phase === "action_verification") return "Đang xác minh kết quả";
  if (activity.phase === "action_completed") return "Đã hoàn tất hành động";
  return `Đang xử lý ${resource}`;
};

const isActivityRunning = (activity: AgentActivity) =>
  activity.event
    ? activity.status === "running"
    : activity.status === "running" ||
      activity.phase === "resource_selected" ||
      activity.phase === "tool_start";

const isActivityCompleted = (activity: AgentActivity) =>
  activity.phase === "tool_end" ||
  activity.phase === "evidence_summary" ||
  ["succeeded", "completed", "failed", "forbidden", "insufficient", "error"].includes(
    activity.status ?? ""
  );

const ThinkingActivityList: FC<{
  activities: readonly AgentActivity[];
  reasonings: readonly AgentReasoning[];
}> = ({ activities, reasonings }) => {
  const completedActivityIds = new Set(
    activities
      .filter(isActivityCompleted)
      .map((activity) => activity.activity_id)
      .filter((activityId): activityId is string => Boolean(activityId))
  );

  return (
    <div
      data-slot="aui_thinking-activity-list"
      className="mb-2 space-y-1.5 text-xs text-(--claude-muted)"
    >
      {[...activities.slice(-6), ...reasonings.slice(-3)].map((activity, index) => {
        const reasoningText =
          (activity as AgentReasoning).reasoning?.analysis ??
          (activity as AgentReasoning).reasoning?.next_step;
        const completed =
          isActivityCompleted(activity) ||
          Boolean(activity.activity_id && completedActivityIds.has(activity.activity_id));
        const label = reasoningText || formatActivityLabel(activity, completed);
        const running = isActivityRunning(activity) && !completed;

        return (
          <div
            key={`${activity.activity_id ?? activity.event ?? activity.phase}-${index}`}
            className="flex items-start gap-2 leading-5"
            data-status={running ? "running" : "completed"}
          >
            <span
              className={cn(
                "mt-1.5 size-1.5 shrink-0 rounded-full",
                running
                  ? "aui-thinking-status-pulse bg-(--claude-accent)"
                  : "bg-(--claude-muted)/50"
              )}
              aria-hidden
            />
            <span className="min-w-0">{label}</span>
          </div>
        );
      })}
    </div>
  );
};

export const ThinkingActivityPanel: FC<{
  activities: readonly AgentActivity[];
  reasonings?: readonly AgentReasoning[];
  isBusy: boolean;
}> = ({ activities, reasonings = [], isBusy }) => {
  const [userOpen, setUserOpen] = useState(false);
  const open = isBusy || userOpen;
  const stepCount = activities.length + reasonings.length;

  return (
    <Collapsible
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isBusy) setUserOpen(nextOpen);
      }}
      className="aui-thinking-panel relative mt-2 mb-2 max-w-full overflow-hidden rounded-lg border border-(--claude-border-subtle) bg-(--claude-card)/60 px-3 py-2.5 ps-4"
      aria-busy={isBusy}
    >
      <CollapsibleTrigger className="group flex w-full min-w-0 items-center justify-between gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-(--claude-accent)/40 focus-visible:ring-offset-2">
        <ThinkingHeaderLoop loop={isBusy} label={isBusy ? THINKING_LABEL : "Luồng xử lý"} />
        <span className="flex shrink-0 items-center gap-1.5 text-(--claude-muted)">
          {!isBusy && stepCount > 0 ? (
            <span className="text-[10px] font-normal tabular-nums">{stepCount} bước</span>
          ) : null}
          <ChevronDownIcon className="size-3.5 transition-transform duration-200 group-aria-expanded:rotate-180" />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-open:animate-accordion-down data-closed:animate-accordion-up">
        <div className="pt-1.5">
          <ThinkingActivityList activities={activities} reasonings={reasonings} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

/** Hiện ngay sau khi gửi (trước khi có text stream part). */
export const ThinkingPanelImmediate: FC<React.ComponentProps<"div">> = ({
  className,
  ...props
}) => (
  <div className={className} {...props}>
    <ThinkingContentPanel text="" isBusy />
  </div>
);

export const ThinkingLoading: FC<React.ComponentProps<"div">> = ({ className, ...props }) => (
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
  const targetPhase = useMemo(() => getThinkingTargetPhase(parsed, isRunning), [parsed, isRunning]);

  const [displayPhase, setDisplayPhase] = useState<ThinkingDisplayPhase>(() =>
    parsed.thinking.trim() ? "thinking" : "loading"
  );
  const [exitingPhase, setExitingPhase] = useState<ThinkingDisplayPhase | null>(null);
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
      displayPhase === "loading" && next === "thinking" && parsed.thinking.trim().length > 0;
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
  const panelActive = displayPhase === "loading" || displayPhase === "thinking";
  const panelExiting = exitingPhase === "loading" || exitingPhase === "thinking";
  const isPanelBusy = isRunning && !showAnswer;
  const forcePanelOpen = isRunning && showThinkingPanel;

  return (
    <div
      data-slot="aui_assistant-text-thinking"
      className="flex flex-col gap-2"
      style={{ "--thinking-phase-ms": `${PHASE_MS}ms` } as React.CSSProperties}
    >
      {showThinkingPanel ? (
        <div className={phasePanelClass(panelActive, panelExiting, forcePanelOpen)}>
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
  // Ordinary assistant text must remain visible while the SSE response is
  // running. Only messages that actually contain a thinking marker use the
  // phase panel; otherwise the Markdown renderer receives each text-delta.
  const useThinkingFlow = hasThinkingInText(text);

  if (!useThinkingFlow) {
    return <MarkdownText preprocess={sanitizeAssistantText} />;
  }

  return <AssistantTextWithThinking />;
};

export const AssistantText = memo(AssistantTextImpl);

export const AssistantPendingIndicator: FC = () => {
  const hasTextPart = useAuiState((s) => s.message.parts.some((p) => p.type === "text"));
  if (hasTextPart) return null;
  return (
    <ThinkingPanelImmediate
      data-slot="aui_assistant-message-indicator"
      aria-label="Assistant is working"
    />
  );
};
