"use client";

import type {
  MessageFormatAdapter,
  MessageFormatItem,
  RemoteThreadListAdapter,
  ThreadHistoryAdapter,
} from "@assistant-ui/core";
import { RuntimeAdapterProvider } from "@assistant-ui/core/react";
import { useAui, type AssistantClient } from "@assistant-ui/react";
import { createAssistantStream, type AssistantStream } from "assistant-stream";
import type { UIMessage } from "ai";
import type { FC, PropsWithChildren } from "react";

type ThreadSummary = { id: string; title: string; updated_at: string };

function scopedUrl(studentId: string, threadId?: string) {
  const query = new URLSearchParams({ student_id: studentId });
  return `/api/threads${threadId ? `/${encodeURIComponent(threadId)}` : ""}?${query}`;
}

async function jsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new Error(body?.error ?? body?.message ?? `Chat API lỗi (${response.status})`);
  }
  return response.json() as Promise<T>;
}

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  await jsonOrThrow<void>(response);
}

class StudentThreadHistory implements ThreadHistoryAdapter {
  constructor(private readonly studentId: string, private readonly aui: AssistantClient) {}

  withFormat<TMessage, TStorageFormat extends Record<string, unknown>>(
    formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
  ) {
    const { studentId, aui } = this;
    return {
      async load() {
        const threadId = aui.threadListItem().getState().remoteId;
        if (!threadId) return { messages: [] };
        const messages = await jsonOrThrow<UIMessage[]>(await fetch(scopedUrl(studentId, threadId), { cache: "no-store" }));
        let parentId: string | null = null;
        return {
          messages: messages.map((message) => {
            const item: MessageFormatItem<TMessage> = {
              parentId,
              message: message as unknown as TMessage,
            };
            parentId = formatAdapter.getId(item.message);
            return item;
          }),
          headId: parentId,
        };
      },
      async append() {
        // crm-ai persists the completed UI message stream for each turn.
      },
      async update() {
        // Approval and tool updates are persisted by the next streamed turn.
      },
    };
  }

  async load() {
    return { messages: [] };
  }

  async append() {}
}

function historyProvider(studentId: string): FC<PropsWithChildren> {
  return function StudentHistoryProvider({ children }) {
    const aui = useAui();
    const history = new StudentThreadHistory(studentId, aui);
    return <RuntimeAdapterProvider adapters={{ history }}>{children}</RuntimeAdapterProvider>;
  };
}

export function createStudentThreadAdapter(studentId: string): RemoteThreadListAdapter {
  return {
    unstable_Provider: historyProvider(studentId),
    async list() {
      const threads = await jsonOrThrow<ThreadSummary[]>(await fetch(scopedUrl(studentId), { cache: "no-store" }));
      return { threads: threads.map((thread) => ({ remoteId: thread.id, status: "regular", title: thread.title })) };
    },
    async initialize(threadId) {
      return { remoteId: threadId, externalId: undefined };
    },
    async rename(threadId, title) {
      await ensureOk(await fetch(scopedUrl(studentId, threadId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      }));
    },
    async archive() {},
    async unarchive() {},
    async delete(threadId) {
      await ensureOk(await fetch(scopedUrl(studentId, threadId), { method: "DELETE" }));
    },
    async fetch(threadId) {
      const threads = await jsonOrThrow<ThreadSummary[]>(await fetch(scopedUrl(studentId), { cache: "no-store" }));
      const thread = threads.find((item) => item.id === threadId);
      if (!thread) throw new Error("Không tìm thấy cuộc trò chuyện");
      return { remoteId: thread.id, status: "regular", title: thread.title };
    },
    async generateTitle(_threadId, messages): Promise<AssistantStream> {
      const first = messages.find((message) => message.role === "user");
      const text = first?.content?.filter((part) => part.type === "text").map((part) => part.text).join(" ") ?? "";
      const title = text.trim().slice(0, 60) || "Cuộc trò chuyện mới";
      return createAssistantStream((controller) => controller.appendText(title));
    },
  };
}
