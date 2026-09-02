"use client";

import { BookOpenIcon } from "lucide-react";
import { useAuiState } from "@assistant-ui/react";
import { useMemo } from "react";

type Citation = {
  doc_id?: string;
  chunk_id?: string;
  doc_title?: string;
  doc_version?: string;
  effective_date?: string;
  expires_at?: string;
};

type DataPart = {
  type?: string;
  name?: string;
  data?: unknown;
};

function getCitations(parts: readonly unknown[]): Citation[] {
  const envelope = parts.find((part) => {
    const item = part as DataPart;
    return item.type === "data-envelope" || (item.type === "data" && item.name === "envelope");
  }) as DataPart | undefined;

  const data = envelope?.data as { citations?: unknown } | undefined;
  if (!Array.isArray(data?.citations)) return [];

  return data.citations.filter((item): item is Citation =>
    Boolean(
      item && typeof item === "object" && ((item as Citation).doc_id || (item as Citation).chunk_id)
    )
  );
}

/** Compact provenance hints; the full source identity is revealed on hover/focus. */
export function CitationHints() {
  const messageParts = useAuiState((state) => state.message.parts);
  const citations = useMemo(() => getCitations(messageParts), [messageParts]);
  if (!citations.length) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Nguồn tham khảo">
      {citations.map((citation, index) => {
        const title = citation.doc_title || citation.doc_id || "Tài liệu KB";
        const sourceId = [citation.doc_id, citation.chunk_id].filter(Boolean).join(" / ");

        return (
          <div key={`${sourceId || title}-${index}`} className="group relative">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-(--claude-border) bg-(--claude-card)/70 px-2 py-1 text-[11px] font-medium text-(--claude-muted) outline-none transition-colors hover:border-(--claude-text)/30 hover:text-(--claude-text) focus-visible:ring-2 focus-visible:ring-(--claude-text)/30"
              aria-label={`Xem nguồn ${index + 1}: ${title}`}
            >
              <BookOpenIcon className="size-3" aria-hidden="true" />
              Nguồn {index + 1}
            </button>
            <div
              role="tooltip"
              className="pointer-events-none invisible absolute bottom-full left-0 z-50 mb-2 w-72 -translate-y-1 rounded-xl border border-(--claude-border) bg-(--claude-surface) p-3 text-left text-xs text-(--claude-text) opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.14)] transition-all group-hover:visible group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100"
            >
              <p className="font-medium leading-snug">{title}</p>
              {citation.doc_version && (
                <p className="mt-1 text-(--claude-muted)">Phiên bản: {citation.doc_version}</p>
              )}
              {sourceId && (
                <p className="mt-1 break-all font-mono text-[10px] text-(--claude-muted)">
                  {sourceId}
                </p>
              )}
              {(citation.effective_date || citation.expires_at) && (
                <p className="mt-1 text-(--claude-muted)">
                  {citation.effective_date && `Hiệu lực từ ${citation.effective_date}`}
                  {citation.effective_date && citation.expires_at && " · "}
                  {citation.expires_at && `Hết hạn ${citation.expires_at}`}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
