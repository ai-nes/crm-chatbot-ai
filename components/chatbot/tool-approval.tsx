"use client";

import { useAuiState } from "@assistant-ui/react";
import { CheckIcon, ShieldAlertIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type FieldChange = { field?: string; label?: string; before?: unknown; after?: unknown };

type ApprovalPreview = {
  tool_call_id?: string;
  summary?: string | null;
  diff?: FieldChange[];
};

export type ToolApproval = { id: string; approved?: boolean; reason?: string };

/** Trợ lý gửi kèm bản xem trước (tóm tắt + thay đổi) dưới dạng data part `approval`. */
function usePreview(toolCallId: string): ApprovalPreview | null {
  return useAuiState((s) => {
    for (const part of s.message.parts) {
      const kind = String(part.type);
      const name = String((part as { name?: string }).name ?? "");
      if (!(kind === "data-approval" || (kind === "data" && name === "approval"))) continue;
      const data = (part as { data?: ApprovalPreview }).data;
      if (data?.tool_call_id === toolCallId) return data;
    }
    return null;
  });
}

const show = (value: unknown) =>
  value === null || value === undefined || value === "" ? "—" : String(value);

/** Thẻ xác nhận một thao tác CRM mà trợ lý muốn thực hiện (AI SDK v6 tool approval). */
export function ToolApprovalCard({
  toolCallId,
  approval,
  respondToApproval,
}: {
  toolCallId: string;
  approval: ToolApproval;
  respondToApproval: (response: { approved: boolean; reason?: string }) => void;
}) {
  const preview = usePreview(toolCallId);
  const diff = preview?.diff ?? [];

  return (
    <div className="my-3 max-w-xl rounded-2xl border border-(--claude-border) bg-(--claude-surface) p-4 text-sm text-(--claude-text) shadow-sm">
      <div className="flex items-center gap-1.5 font-semibold">
        <ShieldAlertIcon className="size-4 text-(--claude-muted)" />
        <span>Xác nhận thao tác CRM</span>
      </div>
      <p className="mt-1.5 leading-relaxed">
        {preview?.summary ?? "Trợ lý đề xuất một thay đổi dữ liệu CRM."}
      </p>
      {diff.length > 0 ? (
        <ul className="mt-2 space-y-1 text-[13px]">
          {diff.map((change, index) => (
            <li key={`${change.field ?? index}`} className="text-(--claude-muted)">
              <span className="font-medium text-(--claude-text)">{change.label ?? change.field}</span>
              {": "}
              <span className="line-through">{show(change.before)}</span>
              {" → "}
              <span className="font-medium text-(--claude-text)">{show(change.after)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {approval.approved === undefined ? (
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => respondToApproval({ approved: true })}
            className="rounded-xl bg-[#1a1915] text-white hover:bg-[#2d2c28]"
          >
            <CheckIcon className="size-4" /> Duyệt
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => respondToApproval({ approved: false })}
            className="rounded-xl border-(--claude-border) text-(--claude-muted) hover:text-(--claude-text)"
          >
            <XIcon className="size-4" /> Từ chối
          </Button>
        </div>
      ) : (
        <p
          className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${
            approval.approved ? "text-emerald-600" : "text-amber-600"
          }`}
        >
          {approval.approved ? <CheckIcon className="size-4" /> : <XIcon className="size-4" />}
          {approval.approved ? "Đã duyệt thao tác." : "Đã từ chối thao tác."}
        </p>
      )}
    </div>
  );
}
