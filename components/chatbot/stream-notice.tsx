"use client";

import { useAuiState } from "@assistant-ui/react";
import { BrainIcon, InfoIcon } from "lucide-react";
import { useMemo, useState, type FC } from "react";
import { toast } from "sonner";

type DataPart = { type?: string; name?: string; data?: { id?: string; text?: string } };

const isKind = (part: DataPart, kind: "memory" | "compaction") =>
  part.type === `data-${kind}` || (part.type === "data" && part.name === kind);

type Notice = { key: number; kind: "memory" | "compaction"; id?: string; text?: string };

const noticeClass =
  "mt-2 flex items-center gap-1.5 text-xs text-(--claude-muted)";

const MemoryNotice: FC<{ id?: string; text: string }> = ({ id, text }) => {
  const [undone, setUndone] = useState(false);

  const undo = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/memory/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(String(res.status));
      setUndone(true);
    } catch {
      toast.error("Không hoàn tác được, thử lại sau");
    }
  };

  return (
    <div className={noticeClass} data-slot="stream-notice-memory">
      <BrainIcon className="size-3.5 shrink-0" aria-hidden="true" />
      {undone ? (
        <span>Đã quên: {text}</span>
      ) : (
        <>
          <span className="min-w-0 wrap-break-word">Đã ghi nhớ: {text}</span>
          {id ? (
            <button
              type="button"
              onClick={() => void undo()}
              className="shrink-0 font-medium underline underline-offset-2 hover:text-(--claude-text)"
            >
              Hoàn tác
            </button>
          ) : null}
        </>
      )}
    </div>
  );
};

/** Thông báo nhỏ trợ lý gửi kèm lượt trả lời: đã ghi nhớ điều gì, hoặc đã rút gọn hội thoại dài. */
export const StreamNotices: FC = () => {
  const parts = useAuiState((state) => state.message.parts);
  const notices = useMemo(
    () =>
      (parts as readonly DataPart[]).flatMap((part, index): Notice[] => {
        if (isKind(part, "memory") && part.data?.text) return [{ key: index, kind: "memory", ...part.data }];
        if (isKind(part, "compaction")) return [{ key: index, kind: "compaction", ...part.data }];
        return [];
      }),
    [parts],
  );
  if (!notices.length) return null;

  return (
    <div aria-live="polite">
      {notices.map((notice) =>
        notice.kind === "memory" ? (
          <MemoryNotice key={notice.key} id={notice.id} text={notice.text ?? ""} />
        ) : (
          <div key={notice.key} className={noticeClass} data-slot="stream-notice-compaction">
            <InfoIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{notice.text || "Hội thoại dài đã được tóm tắt để trợ lý nhớ ngữ cảnh."}</span>
          </div>
        ),
      )}
    </div>
  );
};
