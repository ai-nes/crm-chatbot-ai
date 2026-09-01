"use client";

import { useState } from "react";
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type ApprovalData = {
  proposal_id?: string;
  proposalId?: string;
  action_type?: string;
  required_role?: string;
  reason?: string;
  [key: string]: unknown;
};

export function ApprovalGate({ data }: { data: ApprovalData }) {
  const proposal = data.proposal as ApprovalData | undefined;
  const details = proposal ? { ...data, ...proposal } : data;
  const proposalId = details.proposal_id ?? details.proposalId;
  const [state, setState] = useState<"pending" | "loading" | "approved" | "rejected" | "error">(
    "pending"
  );
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approve" | "reject") {
    if (!proposalId || state !== "pending") return;
    setState("loading");
    setError(null);
    try {
      const response = await fetch(`/api/chat/actions/${encodeURIComponent(proposalId)}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? payload.detail ?? "Không thể phê duyệt");
      setState(decision === "approve" ? "approved" : "rejected");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể phê duyệt");
      setState("error");
    }
  }

  return (
    <div className="my-3 max-w-xl rounded-2xl border border-(--claude-border) bg-(--claude-surface) p-4 text-sm text-(--claude-text) shadow-sm">
      <div className="font-medium">Xác nhận thao tác CRM</div>
      <p className="mt-1 text-(--claude-muted)">
        {details.reason ?? `Đề xuất thao tác ${details.action_type ?? "CRM"}.`}
      </p>
      {details.required_role && (
        <p className="mt-2 text-xs text-(--claude-muted)">
          Vai trò yêu cầu: {details.required_role}
        </p>
      )}
      {state === "pending" || state === "error" ? (
        <div className="mt-3 flex flex-wrap gap-2">
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
            className="rounded-xl border-(--claude-border)"
          >
            <XIcon className="size-4" /> Từ chối
          </Button>
        </div>
      ) : state === "loading" ? (
        <div className="mt-3 flex items-center gap-2 text-(--claude-muted)">
          <Loader2Icon className="size-4 animate-spin" /> Đang xử lý...
        </div>
      ) : (
        <div className="mt-3 text-(--claude-muted)">
          {state === "approved" ? "Đã duyệt thao tác." : "Đã từ chối thao tác."}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
