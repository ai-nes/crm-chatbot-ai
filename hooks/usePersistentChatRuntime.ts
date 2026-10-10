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
import { useServerThreadAdapter } from "@/lib/chat/server-thread-adapter";
import { createStudentThreadAdapter } from "@/lib/chat/student-thread-adapter";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { useMemo } from "react";

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
  void _isDisabled;
  void _isSendDisabled;
  void _unstable_capabilities;
  void _suggestions;
  true satisfies keyof typeof chatOptions &
    keyof ExternalStoreSharedOptions extends never
    ? true
    : never;

  const transport = transportOptions ?? new AssistantChatTransport();

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

/** Thread list + messages do trợ lý AI lưu theo người dùng (qua crm-backend). */
export function usePersistentChatRuntime<
  UI_MESSAGE extends UIMessage = UIMessage,
>(options: UseChatRuntimeOptions<UI_MESSAGE> = {}, studentId?: string): AssistantRuntime {
  const studentAdapter = useMemo(
    () => (studentId ? createStudentThreadAdapter(studentId) : null),
    [studentId],
  );
  const serverAdapter = useServerThreadAdapter();
  const adapter = studentAdapter ?? serverAdapter;

  return useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useChatThreadRuntime(options);
    },
    adapter,
    allowNesting: true,
  });
}
