import type { AssistantRuntime, ThreadMessage } from "@assistant-ui/react";
import { STUDENT_OPENING_GREETING_ACTION } from "@/components/chatbot/student-chat-context";

type MemoryPart = {
  type?: string;
  name?: string;
  data?: { id?: string };
  toolName?: string;
  result?: unknown;
};

export function hasMemoryReceipt(message: ThreadMessage): boolean {
  return message.content.some((part) => {
    const value = part as MemoryPart;
    return (
      (value.type === "data-memory" || (value.type === "data" && value.name === "memory")) &&
      typeof value.data?.id === "string"
    );
  });
}

export function needsConversationMemory(messages: readonly ThreadMessage[]): boolean {
  const lastUser = messages.findLastIndex(
    (message) =>
      message.role === "user" &&
      message.metadata.custom.assistantAction !== "remember-conversation" &&
      message.metadata.custom.assistantAction !== STUDENT_OPENING_GREETING_ACTION &&
      (message.content.some(
        (part) =>
          part.type === "text" &&
          part.text.trim() &&
          !/^(xin chào|chào|hello|hi|cảm ơn|thanks)[!.\s]*$/iu.test(part.text.trim())
      ) ||
        (message.role === "user" && message.attachments.length > 0))
  );
  if (lastUser < 0) return false;
  return !messages.slice(lastUser + 1).some(
    (message) =>
      hasMemoryReceipt(message) ||
      message.content.some((part) => {
        const value = part as MemoryPart;
        return (
          value.type === "tool-call" &&
          value.toolName === "remember" &&
          value.result === "Đã ghi nhớ."
        );
      })
  );
}

/** Consent is explicit. Success requires a persisted-memory notice from this exact run. */
export function rememberConversation(
  runtime: AssistantRuntime,
  signal?: AbortSignal
): Promise<void> {
  if (runtime.thread.getState().isRunning)
    return Promise.reject(new Error("Fpilot đang trả lời. Vui lòng chờ một chút."));
  const memoryRequestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      signal?.removeEventListener("abort", cancel);
      if (error) reject(error);
      else resolve();
    };
    const cancel = () => finish(new Error("Đã hủy ghi nhớ."));
    const timer = setTimeout(
      () => finish(new Error("Ghi nhớ mất nhiều thời gian. Vui lòng thử lại.")),
      120000
    );
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) {
      cancel();
      return;
    }
    unsubscribe = runtime.thread.subscribe(() => {
      const state = runtime.thread.getState();
      const requestIndex = state.messages.findIndex(
        (message) => message.metadata.custom.memoryRequestId === memoryRequestId
      );
      if (requestIndex < 0) return;
      const replies = state.messages
        .slice(requestIndex + 1)
        .filter((message) => message.role === "assistant");
      if (
        !replies.length ||
        state.isRunning ||
        replies.some((message) => message.role === "assistant" && message.status.type === "running")
      )
        return;
      finish(
        replies.some(hasMemoryReceipt)
          ? undefined
          : new Error(
              "Chưa ghi nhớ được thông tin mới. Bạn có thể thử lại hoặc đóng cuộc trò chuyện."
            )
      );
    });
    try {
      runtime.thread.append({
        role: "user",
        content: [
          {
            type: "text",
            text: "Hãy xem lại những nội dung người dùng và trợ lý đã trao đổi trước yêu cầu này. Chỉ lưu bằng công cụ remember các thông tin hữu ích lâu dài thành ghi chú ngắn; không lưu lời chào, yêu cầu ghi nhớ hay toàn bộ transcript. Với hồ sơ học sinh đang chọn, ghi rõ tên học sinh trong ghi chú và chỉ ghi nhớ thông tin thuộc hồ sơ đó. Nếu không có thông tin phù hợp để lưu thì không gọi remember và chỉ trả lời ngắn gọn rằng cuộc trò chuyện chưa có thông tin phù hợp.",
          },
        ],
        metadata: { custom: { assistantAction: "remember-conversation", memoryRequestId } },
      });
    } catch (error) {
      finish(error instanceof Error ? error : new Error("Không ghi nhớ được cuộc trò chuyện."));
    }
  });
}
