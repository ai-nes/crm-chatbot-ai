"use client";

import {
  pickExternalStoreSharedOptions,
  type AssistantRuntime,
  type ExternalStoreSharedOptions,
} from "@assistant-ui/core";
import { useRemoteThreadListRuntime } from "@assistant-ui/core/react";
import { useAui, useAuiState } from "@assistant-ui/react";
import {
  useAISDKRuntime,
  AssistantChatTransport,
  type UseChatRuntimeOptions,
} from "@assistant-ui/react-ai-sdk";
import { useLocalStorageThreadAdapter } from "@/lib/chat/local-storage-thread-adapter";
import { useChat, type UIMessage } from "@ai-sdk/react";
import type { ChatTransport } from "ai";
import { useEffect, useMemo, useRef } from "react";

const useDynamicChatTransport = <UI_MESSAGE extends UIMessage = UIMessage>(
  transport: ChatTransport<UI_MESSAGE>,
): ChatTransport<UI_MESSAGE> => {
  const transportRef = useRef(transport);
  useEffect(() => {
    transportRef.current = transport;
  });
  return useMemo(
    () =>
      new Proxy(transportRef.current, {
        get(_, prop) {
          const res =
            transportRef.current[prop as keyof ChatTransport<UI_MESSAGE>];
          return typeof res === "function"
            ? res.bind(transportRef.current)
            : res;
        },
      }),
    [],
  );
};

const useChatThreadRuntime = <UI_MESSAGE extends UIMessage = UIMessage>(
  options?: UseChatRuntimeOptions<UI_MESSAGE>,
): AssistantRuntime => {
  const {
    adapters,
    transport: transportOptions,
    toCreateMessage,
    isDisabled: _isDisabled,
    isSendDisabled: _isSendDisabled,
    unstable_capabilities: _unstable_capabilities,
    suggestions: _suggestions,
    onResume,
    ...chatOptions
  } = options ?? {};
  true satisfies keyof typeof chatOptions &
    keyof ExternalStoreSharedOptions extends never
    ? true
    : never;

  const transport = useDynamicChatTransport(
    transportOptions ?? new AssistantChatTransport(),
  );

  const id = useAuiState((s) => s.threadListItem.id);
  const aui = useAui();
  const chat = useChat({
    ...chatOptions,
    id,
    transport,
  });

  const runtime = useAISDKRuntime(chat, {
    adapters,
    ...pickExternalStoreSharedOptions(options ?? {}),
    ...(toCreateMessage && { toCreateMessage }),
    ...(onResume && { onResume }),
  });

  if (transport instanceof AssistantChatTransport) {
    transport.setRuntime(runtime);
    transport.__internal_setGetThreadListItem(() =>
      aui.threadListItem.source ? aui.threadListItem() : undefined,
    );
  }

  return runtime;
};

export function usePersistentChatRuntime<
  UI_MESSAGE extends UIMessage = UIMessage,
>(options: UseChatRuntimeOptions<UI_MESSAGE> = {}): AssistantRuntime {
  const adapter = useLocalStorageThreadAdapter();

  return useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useChatThreadRuntime(options);
    },
    adapter,
    allowNesting: true,
  });
}
