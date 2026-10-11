"use client";

import type {
  MessageFormatAdapter,
  RemoteThreadInitializeResponse,
  RemoteThreadListAdapter,
  RemoteThreadListResponse,
  RemoteThreadMetadata,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import { createSimpleTitleAdapter, RuntimeAdapterProvider } from "@assistant-ui/core/react";
import { useAui, type AssistantClient } from "@assistant-ui/store";
import { createAssistantStream, type AssistantStream } from "assistant-stream";
import type { UIMessage } from "ai";
import { type FC, type PropsWithChildren, useMemo } from "react";
import { observeThreadLoad, type ThreadLoadObserver } from "@/lib/chat/thread-load-observer";
import { STUDENT_OPENING_GREETING_ACTION } from "@/components/chatbot/student-chat-context";

type ServerThread = {
  id: string;
  title: string | null;
  student_id?: string | null;
  updated_at: string;
};

async function call(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`/api/threads${path}`, { cache: "no-store", ...init });
  if (!res.ok) throw new Error(`threads${path}: ${res.status}`);
  return res;
}

const metadataOf = (thread: ServerThread): RemoteThreadMetadata => ({
  remoteId: thread.id,
  externalId: undefined,
  status: "regular",
  title: thread.title ?? undefined,
  custom: { studentId: thread.student_id ?? null },
});

/**
 * Lịch sử do trợ lý AI lưu theo người dùng: chỉ cần đọc. Tin nhắn mới được máy chủ ghi
 * ngay trong lượt chat, nên append/update ở đây không gửi gì đi.
 */
class ServerThreadHistoryAdapter implements ThreadHistoryAdapter {
  constructor(
    private aui: AssistantClient,
    private observer?: ThreadLoadObserver
  ) {}

  withFormat<TMessage, TStorageFormat extends Record<string, unknown>>(
    // Tin nhắn đã ở dạng UIMessage của AI SDK v6 nên không cần mã hoá/giải mã.
    ...[]: [MessageFormatAdapter<TMessage, TStorageFormat>?]
  ) {
    const aui = this.aui;
    const observer = this.observer;
    return {
      async load() {
        const remoteId = aui.threadListItem().getState().remoteId;
        if (!remoteId) return { messages: [] };
        const stored = await observeThreadLoad(
          "messages",
          observer,
          async () =>
            (await (await call(`/${encodeURIComponent(remoteId)}`)).json()) as UIMessage[],
          remoteId
        );
        const messages = stored.map((message, index) => ({
          parentId: index === 0 ? null : stored[index - 1]!.id,
          message: message as TMessage,
        }));
        return { messages };
      },
      async append() {
        // Đảm bảo thread đã có remoteId để lần tải sau đọc đúng.
        await aui.threadListItem().initialize();
      },
      async update() {},
    };
  }

  async load() {
    return { messages: [] };
  }

  async append() {}
}

const HistoryProvider: FC<PropsWithChildren<{ observer?: ThreadLoadObserver }>> = ({
  children,
  observer,
}) => {
  const aui = useAui();
  const history = useMemo(() => new ServerThreadHistoryAdapter(aui, observer), [aui, observer]);
  const adapters = useMemo(() => ({ history }), [history]);
  return <RuntimeAdapterProvider adapters={adapters}>{children}</RuntimeAdapterProvider>;
};

export function createServerThreadAdapter(observer?: ThreadLoadObserver): RemoteThreadListAdapter {
  const titles = createSimpleTitleAdapter();

  const listThreads = async () => (await (await call("")).json()) as ServerThread[];

  return {
    unstable_Provider: function ServerHistoryProvider({ children }) {
      return <HistoryProvider observer={observer}>{children}</HistoryProvider>;
    },

    async list(): Promise<RemoteThreadListResponse> {
      return { threads: (await listThreads()).map(metadataOf) };
    },

    // Id do trình duyệt sinh; máy chủ tạo hội thoại ở lượt chat đầu tiên.
    async initialize(threadId: string): Promise<RemoteThreadInitializeResponse> {
      return { remoteId: threadId, externalId: undefined };
    },

    async rename(remoteId: string, newTitle: string): Promise<void> {
      await call(`/${encodeURIComponent(remoteId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
    },

    // Máy chủ không có khái niệm lưu trữ; giao diện không còn mục này.
    async archive(): Promise<void> {},
    async unarchive(): Promise<void> {},

    async delete(remoteId: string): Promise<void> {
      try {
        await call(`/${encodeURIComponent(remoteId)}`, { method: "DELETE" });
      } catch (error) {
        // Thread chưa từng gửi tin nào thì máy chủ chưa có: coi như đã xoá.
        if (!(error instanceof Error) || !error.message.endsWith(": 404")) throw error;
      }
    },

    async fetch(threadId: string): Promise<RemoteThreadMetadata> {
      const thread = (await listThreads()).find((item) => item.id === threadId);
      if (!thread) throw new Error("Thread not found");
      return metadataOf(thread);
    },

    // Máy chủ đã đặt tên theo câu hỏi đầu tiên; chỉ hiển thị ngay trong phiên.
    async generateTitle(
      _remoteId: string,
      messages: readonly ThreadMessage[]
    ): Promise<AssistantStream> {
      const firstUser = messages.find((message) => message.role === "user");
      const metadata = firstUser?.metadata as
        | { custom?: { assistantAction?: string } }
        | undefined;
      const title =
        metadata?.custom?.assistantAction === STUDENT_OPENING_GREETING_ACTION
          ? "Tra cứu hồ sơ học sinh"
          : await titles.generateTitle(messages);
      return createAssistantStream((controller) => {
        controller.appendText(title);
      });
    },
  };
}

export function useServerThreadAdapter(observer?: ThreadLoadObserver) {
  return useMemo(() => createServerThreadAdapter(observer), [observer]);
}
