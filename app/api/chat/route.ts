import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import {
  createMockChatStreamResponse,
  isMockChatEnabled,
} from "@/lib/chat/mock-chat-stream";
import { extractUserText, getMockReply } from "@/lib/chat/mock-responses";

export const maxDuration = 30;

const CRM_SYSTEM_PROMPT =
  "Bạn là trợ lý AI của hệ thống CRM. Hỗ trợ nhân viên tra cứu khách hàng, quản lý ticket, báo cáo doanh số và hướng dẫn sử dụng CRM. Trả lời bằng tiếng Việt, ngắn gọn và chuyên nghiệp.";

export async function POST(req: Request) {
  const { messages, system, tools } = await req.json();
  const uiMessages = messages as UIMessage[];

  if (isMockChatEnabled()) {
    const userText = extractUserText(uiMessages);
    const reply = getMockReply(userText);
    return createMockChatStreamResponse(reply, uiMessages);
  }

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: system ?? CRM_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: frontendTools(tools),
  });
  return result.toUIMessageStreamResponse();
}
