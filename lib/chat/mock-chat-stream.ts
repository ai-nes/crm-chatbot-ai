import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";

const STREAM_CHAR_DELAY_MS = 18;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export function createMockChatStreamResponse(
  text: string,
  originalMessages?: UIMessage[],
) {
  const stream = createUIMessageStream({
    originalMessages,
    execute: async ({ writer }) => {
      const textId = "mock-text-1";

      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id: textId });

      for (const char of text) {
        writer.write({ type: "text-delta", id: textId, delta: char });
        if (char.trim()) {
          await sleep(STREAM_CHAR_DELAY_MS);
        }
      }

      writer.write({ type: "text-end", id: textId });
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export function isMockChatEnabled() {
  return (
    process.env.MOCK_CHAT === "true" ||
    process.env.NEXT_PUBLIC_MOCK_CHAT === "true" ||
    !process.env.OPENAI_API_KEY
  );
}
