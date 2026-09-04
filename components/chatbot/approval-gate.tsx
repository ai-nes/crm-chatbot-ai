"use client";

import { useState, useEffect } from "react";
import { CheckIcon, Loader2Icon, PencilIcon, ShieldAlertIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuiState } from "@assistant-ui/react";

export type ApprovalData = {
  proposal_id?: string;
  proposalId?: string;
  action_type?: string;
  required_role?: string;
  reason?: string;
  [key: string]: unknown;
};

type DecisionState = "pending" | "loading" | "approved" | "rejected" | "error";

const decisionMap = new Map<string, { state: DecisionState; error?: string }>();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function useApprovalDecision(proposalId?: string) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const current = proposalId ? decisionMap.get(proposalId) : undefined;
  const state: DecisionState = current?.state ?? "pending";
  const error = current?.error ?? null;

  const decide = async (decision: "approve" | "reject") => {
    if (!proposalId || state === "loading") return;
    decisionMap.set(proposalId, { state: "loading" });
    notify();
    try {
      const response = await fetch(
        `/api/chat/actions/${encodeURIComponent(proposalId)}/resume`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision }),
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? payload.detail ?? "Không thể xử lý yêu cầu");
      }
      decisionMap.set(proposalId, {
        state: decision === "approve" ? "approved" : "rejected",
      });
      notify();
    } catch (cause) {
      decisionMap.set(proposalId, {
        state: "error",
        error: cause instanceof Error ? cause.message : "Không thể xử lý yêu cầu",
      });
      notify();
    }
  };

  return { state, error, decide };
}

export function focusComposerAndSuggest(suggestionText: string = "Tôi muốn điều chỉnh: ") {
  const inputEl = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(
    ".aui-composer-input"
  );
  if (inputEl) {
    inputEl.focus();
    if (!inputEl.value || inputEl.value.trim().length === 0) {
      const nativeSetter =
        Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set ??
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;

      if (nativeSetter) {
        nativeSetter.call(inputEl, suggestionText);
      } else {
        inputEl.value = suggestionText;
      }
      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    }
    inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
  }
}

export function ApprovalGate({ data }: { data: ApprovalData }) {
  const proposal = data.proposal as ApprovalData | undefined;
  const details = proposal ? { ...data, ...proposal } : data;
  const proposalId = details.proposal_id ?? details.proposalId;
  const { state, error, decide } = useApprovalDecision(proposalId);

  return (
    <div className="my-3 max-w-xl rounded-2xl border border-(--claude-border) bg-(--claude-surface) p-4 text-sm text-(--claude-text) shadow-sm transition-all">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-(--claude-text)">Xác nhận thao tác CRM</span>
      </div>
      <p className="mt-1.5 leading-relaxed text-(--claude-muted)">
        {details.reason ?? `Đề xuất thao tác ${details.action_type ?? "CRM"}.`}
      </p>
      {details.required_role && (
        <p className="mt-2 text-xs text-(--claude-muted)">
          Vai trò yêu cầu: <code className="rounded bg-(--claude-card) px-1.5 py-0.5 font-mono text-[11px] text-(--claude-text)">{details.required_role}</code>
        </p>
      )}
      {state === "pending" || state === "error" ? (
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => decide("approve")}
            className="rounded-xl bg-[#1a1915] text-white hover:bg-[#2d2c28]"
          >
            <CheckIcon className="size-4" /> Duyệt
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => decide("reject")}
            className="rounded-xl border-(--claude-border) text-(--claude-muted) hover:text-(--claude-text)"
          >
            <XIcon className="size-4" /> Từ chối
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => focusComposerAndSuggest("Tôi muốn điều chỉnh: ")}
            className="rounded-xl border-(--claude-border) hover:border-(--claude-accent) hover:text-(--claude-accent)"
          >
            <PencilIcon className="size-3.5" /> Nhập theo ý muốn
          </Button>
        </div>
      ) : state === "loading" ? (
        <div className="mt-3 flex items-center gap-2 text-(--claude-muted)">
          <Loader2Icon className="size-4 animate-spin text-(--claude-accent)" /> Đang xử lý...
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 text-xs font-medium">
          {state === "approved" ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-600">
              <CheckIcon className="size-4" /> Đã duyệt thao tác thành công.
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-amber-600">
              <XIcon className="size-4" /> Đã từ chối thao tác này.
            </span>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function ComposerApprovalPrompt() {
  // Readonly demo never proposes a CRM Action, so the agent backend never
  // streams an approval-required data part either — this flag only removes
  // the dead UI surface explicitly instead of relying on that implicitly.
  const readonlyDemo = process.env.NEXT_PUBLIC_COPILOT_DEMO_READONLY === "true";

  const lastAssistantMessage = useAuiState((s) => {
    const msgs = s.thread.messages;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "assistant") return msgs[i];
    }
    return null;
  });

  const approvalPart = lastAssistantMessage?.parts.find(
    (part) =>
      (String(part.type) === "data" &&
        String((part as { name?: string }).name) === "approval-required") ||
      String(part.type) === "data-approval-required"
  ) as unknown as { data?: ApprovalData } | undefined;

  const data = approvalPart?.data;
  const proposal = data?.proposal as ApprovalData | undefined;
  const details = proposal ? { ...data, ...proposal } : data;
  const proposalId = details?.proposal_id ?? details?.proposalId;

  const { state, error, decide } = useApprovalDecision(proposalId);

  if (readonlyDemo || !data || state === "approved" || state === "rejected") return null;

  return (
    <div className="mb-2.5 overflow-hidden rounded-2xl border border-(--claude-border) bg-(--claude-surface) p-3.5 shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-(--claude-text)">
          <ShieldAlertIcon className="size-3.5 text-(--claude-muted)" />
          <span>Xác nhận thao tác CRM</span>
        </div>
        {details?.required_role && (
          <span className="rounded-full bg-(--claude-border)/60 px-2 py-0.5 text-[11px] text-(--claude-muted)">
            {details.required_role}
          </span>
        )}
      </div>

      <p className="mt-1.5 text-[13px] leading-relaxed font-medium text-(--claude-text)">
        {details?.reason ?? `Đề xuất thao tác ${details?.action_type ?? "CRM"}.`}
      </p>

      {state === "pending" || state === "error" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => decide("approve")}
            className="h-8 rounded-xl bg-[#1a1915] px-3.5 text-xs font-medium text-white shadow-sm hover:bg-[#2d2c28]"
          >
            <CheckIcon className="size-3.5" /> Duyệt
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => decide("reject")}
            className="h-8 rounded-xl border-(--claude-border) px-3.5 text-xs font-medium text-(--claude-muted) hover:text-(--claude-text)"
          >
            <XIcon className="size-3.5" /> Từ chối
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => focusComposerAndSuggest("Tôi muốn điều chỉnh: ")}
            className="h-8 rounded-xl border-(--claude-border) bg-transparent px-3.5 text-xs font-medium text-(--claude-text) hover:bg-(--claude-card)"
          >
            <PencilIcon className="size-3.5" /> Nhập theo ý muốn
          </Button>
        </div>
      ) : state === "loading" ? (
        <div className="mt-2.5 flex items-center gap-2 text-xs text-(--claude-muted)">
          <Loader2Icon className="size-3.5 animate-spin text-(--claude-muted)" />
          <span>Đang xử lý yêu cầu...</span>
        </div>
      ) : null}

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
