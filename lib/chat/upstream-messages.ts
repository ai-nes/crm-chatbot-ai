import type { UIMessage } from "ai";

/** Chỉ gửi tin user mới nhất; BE giữ lịch sử theo session/thread. */
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
