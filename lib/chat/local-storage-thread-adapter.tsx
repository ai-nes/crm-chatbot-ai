"use client";

import type {
  MessageFormatAdapter,
  MessageFormatItem,
  RemoteThreadInitializeResponse,
  RemoteThreadListAdapter,
  RemoteThreadListResponse,
  RemoteThreadMetadata,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import {
  createSimpleTitleAdapter,
  RuntimeAdapterProvider,
  type AsyncStorageLike,
  type TitleGenerationAdapter,
} from "@assistant-ui/core/react";
import { useAui, type AssistantClient } from "@assistant-ui/store";
import { createAssistantStream, type AssistantStream } from "assistant-stream";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import { createFormattedPersistence } from "assistant-cloud";
import {
  type FC,
  type PropsWithChildren,
  useMemo,
  useState,
} from "react";

type StoredThreadMetadata = {
  remoteId: string;
  externalId?: string;
  status: "regular" | "archived";
  title?: string;
};

type StoredMessage = {
  id: string;
  parent_id: string | null;
  format: string;
  content: ReadonlyJSONObject;
};

type LocalStorageAdapterOptions = {
  storage: AsyncStorageLike;
  prefix?: string;
  titleGenerator?: TitleGenerationAdapter;
};

class LocalMessagePersistence {
  private idMapping: Record<string, string> = {};

  constructor(
    private storage: AsyncStorageLike,
    private messagesKey: (threadId: string) => string,
  ) {}

  private async readMessages(threadId: string): Promise<StoredMessage[]> {
    const raw = await this.storage.getItem(this.messagesKey(threadId));
    return raw ? (JSON.parse(raw) as StoredMessage[]) : [];
  }

  private async writeMessages(
    threadId: string,
    messages: StoredMessage[],
  ): Promise<void> {
    await this.storage.setItem(
      this.messagesKey(threadId),
      JSON.stringify(messages),
    );
  }

  async append(
    threadId: string,
    messageId: string,
    parentId: string | null,
    format: string,
    content: ReadonlyJSONObject,
  ): Promise<void> {
    const messages = await this.readMessages(threadId);
    const resolvedParentId = parentId
      ? (this.idMapping[parentId] ?? parentId)
      : null;

    messages.push({
      id: messageId,
      parent_id: resolvedParentId,
      format,
      content,
    });
    this.idMapping[messageId] = messageId;
    await this.writeMessages(threadId, messages);
  }

  async update(
    threadId: string,
    messageId: string,
    format: string,
    content: ReadonlyJSONObject,
  ): Promise<void> {
    const messages = await this.readMessages(threadId);
    const index = messages.findIndex((message) => message.id === messageId);
    if (index < 0) return;

    messages[index] = {
      ...messages[index]!,
      format,
      content,
    };
    await this.writeMessages(threadId, messages);
  }

  isPersisted(messageId: string): boolean {
    return messageId in this.idMapping;
  }

  async load(threadId: string, format?: string) {
    const messages = await this.readMessages(threadId);
    for (const message of messages) {
      this.idMapping[message.id] = message.id;
    }
    return format
      ? messages.filter((message) => message.format === format)
      : messages;
  }
}

const persistenceByThread = new WeakMap<
  ReturnType<AssistantClient["threadListItem"]>,
  LocalMessagePersistence
>();

class LocalThreadHistoryAdapter implements ThreadHistoryAdapter {
  constructor(
    private storage: AsyncStorageLike,
    private prefix: string,
    private aui: AssistantClient,
  ) {}

  private get persistence(): LocalMessagePersistence {
    const key = this.aui.threadListItem();
    if (!persistenceByThread.has(key)) {
      persistenceByThread.set(
        key,
        new LocalMessagePersistence(
          this.storage,
          (threadId) => `${this.prefix}messages:${threadId}`,
        ),
      );
    }
    return persistenceByThread.get(key)!;
  }

  withFormat<TMessage, TStorageFormat extends Record<string, unknown>>(
    formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
  ) {
    const formatted = createFormattedPersistence(
      this.persistence,
      formatAdapter,
    );
    const adapter = this;

    return {
      async load() {
        const remoteId = adapter.aui.threadListItem().getState().remoteId;
        if (!remoteId) return { messages: [] };
        return formatted.load(remoteId);
      },
      async append(item: MessageFormatItem<TMessage>) {
        const { remoteId } = await adapter.aui.threadListItem().initialize();
        await formatted.append(remoteId, item);
      },
      async update(
        item: MessageFormatItem<TMessage>,
        localMessageId: string,
      ) {
        const remoteId = adapter.aui.threadListItem().getState().remoteId;
        if (!remoteId) return;
        await formatted.update?.(remoteId, item, localMessageId);
      },
    };
  }

  async load() {
    return { messages: [] };
  }

  async append() {}
}

const createHistoryProvider = (
  storage: AsyncStorageLike,
  prefix: string,
): FC<PropsWithChildren> => {
  const Provider: FC<PropsWithChildren> = ({ children }) => {
    const aui = useAui();
    const history = useMemo(
      () => new LocalThreadHistoryAdapter(storage, prefix, aui),
      [aui],
    );
    const adapters = useMemo(() => ({ history }), [history]);

    return (
      <RuntimeAdapterProvider adapters={adapters}>
        {children}
      </RuntimeAdapterProvider>
    );
  };
  return Provider;
};

export function createLocalStorageThreadAdapter(
  options: LocalStorageAdapterOptions,
): RemoteThreadListAdapter {
  const { storage, prefix = "@assistant-ui:", titleGenerator } = options;
  const threadsKey = `${prefix}threads`;
  const messagesKey = (threadId: string) => `${prefix}messages:${threadId}`;

  const loadThreadMetadata = async (): Promise<StoredThreadMetadata[]> => {
    const raw = await storage.getItem(threadsKey);
    return raw ? (JSON.parse(raw) as StoredThreadMetadata[]) : [];
  };

  const saveThreadMetadata = async (
    threads: StoredThreadMetadata[],
  ): Promise<void> => {
    await storage.setItem(threadsKey, JSON.stringify(threads));
  };

  return {
    unstable_Provider: createHistoryProvider(storage, prefix),

    async list(): Promise<RemoteThreadListResponse> {
      const threads = await loadThreadMetadata();
      return {
        threads: threads.map((thread) => ({
          remoteId: thread.remoteId,
          externalId: thread.externalId,
          status: thread.status,
          title: thread.title,
        })),
      };
    },

    async initialize(
      threadId: string,
    ): Promise<RemoteThreadInitializeResponse> {
      const remoteId = threadId;
      const threads = await loadThreadMetadata();

      if (!threads.some((thread) => thread.remoteId === remoteId)) {
        threads.unshift({
          remoteId,
          status: "regular",
        });
        await saveThreadMetadata(threads);
      }

      return { remoteId, externalId: undefined };
    },

    async rename(remoteId: string, newTitle: string): Promise<void> {
      const threads = await loadThreadMetadata();
      const thread = threads.find((item) => item.remoteId === remoteId);
      if (thread) {
        thread.title = newTitle;
        await saveThreadMetadata(threads);
      }
    },

    async archive(remoteId: string): Promise<void> {
      const threads = await loadThreadMetadata();
      const thread = threads.find((item) => item.remoteId === remoteId);
      if (thread) {
        thread.status = "archived";
        await saveThreadMetadata(threads);
      }
    },

    async unarchive(remoteId: string): Promise<void> {
      const threads = await loadThreadMetadata();
      const thread = threads.find((item) => item.remoteId === remoteId);
      if (thread) {
        thread.status = "regular";
        await saveThreadMetadata(threads);
      }
    },

    async delete(remoteId: string): Promise<void> {
      const threads = await loadThreadMetadata();
      const filtered = threads.filter((thread) => thread.remoteId !== remoteId);
      await saveThreadMetadata(filtered);
      await storage.removeItem(messagesKey(remoteId));
    },

    async fetch(threadId: string): Promise<RemoteThreadMetadata> {
      const threads = await loadThreadMetadata();
      const thread = threads.find((item) => item.remoteId === threadId);
      if (!thread) throw new Error("Thread not found");
      return {
        remoteId: thread.remoteId,
        externalId: thread.externalId,
        status: thread.status,
        title: thread.title,
      };
    },

    async generateTitle(
      remoteId: string,
      messages: readonly ThreadMessage[],
    ): Promise<AssistantStream> {
      if (titleGenerator) {
        const title = await titleGenerator.generateTitle(messages);
        const threads = await loadThreadMetadata();
        const thread = threads.find((item) => item.remoteId === remoteId);
        if (thread) {
          thread.title = title;
          await saveThreadMetadata(threads);
        }

        return createAssistantStream((controller) => {
          controller.appendText(title);
        });
      }

      return createAssistantStream(() => {});
    },
  };
}

export function useLocalStorageThreadAdapter(prefix = "@crm-chatbot:") {
  const [adapter] = useState(() =>
    createLocalStorageThreadAdapter({
      storage: {
        getItem: async (key) => {
          if (typeof window === "undefined") return null;
          return localStorage.getItem(key);
        },
        setItem: async (key, value) => {
          if (typeof window === "undefined") return;
          localStorage.setItem(key, value);
        },
        removeItem: async (key) => {
          if (typeof window === "undefined") return;
          localStorage.removeItem(key);
        },
      },
      prefix,
      titleGenerator: createSimpleTitleAdapter(),
    }),
  );

  return adapter;
}
