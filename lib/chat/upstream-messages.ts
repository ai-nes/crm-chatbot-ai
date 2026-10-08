import type { UIMessage } from "ai";

/**
 * Chỉ gửi phần mới của lượt này; BE giữ lịch sử theo thread.
 * - Lượt hỏi: tin user mới nhất (chỉ phần text).
 * - Lượt duyệt thao tác: tin assistant cuối, chỉ giữ các phần tool đã có phản hồi duyệt.
 */
export function pickMessagesForUpstream(messages: UIMessage[]): UIMessage[] | null {
  const last = messages[messages.length - 1];
  if (last?.role === "assistant") {
    const answered = last.parts.filter(isApprovalResponse);
    if (answered.length > 0) return [{ ...last, parts: answered }];
  }
  const latestUser = pickLatestUserMessageForUpstream(messages);
  return latestUser ? [latestUser] : null;
}

function isApprovalResponse(part: UIMessage["parts"][number]): boolean {
  const state = (part as { state?: string }).state;
  return state === "approval-responded" || state === "output-denied";
}

export function pickLatestUserMessageForUpstream(
  messages: UIMessage[],
): UIMessage | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role !== "user") continue;
    return slimUserMessage(message);
  }
  return null;
}

function slimUserMessage(message: UIMessage): UIMessage {
  const parts =
    message.parts?.filter(
      (part): part is Extract<typeof part, { type: "text" }> =>
        part.type === "text",
    ) ?? [];

  return {
    ...message,
    parts,
  };
}
