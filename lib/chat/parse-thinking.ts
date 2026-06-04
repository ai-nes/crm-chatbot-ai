/** Opening tag, optional attributes. Case-insensitive. */
const thinkingBlockG = () =>
  /<\s*thinking(?:\s[^>]*)?>([\s\S]*?)<\s*\/\s*thinking\s*>/gi;
const thinkingOpenTagG = () => /<\s*thinking(?:\s[^>]*)?>/gi;
const thinkingCloseTagG = () => /<\s*\/\s*thinking\s*>/gi;
const THINKING_OPEN_TAIL =
  /<\s*thinking(?:\s[^>]*)?>([\s\S]*)$/i;
const HAS_THINKING_MARKER = /<\s*thinking/i;

export type ThinkingParseResult = {
  hasThinkingBlock: boolean;
  thinkingComplete: boolean;
  thinking: string;
  answer: string;
};

export function hasThinkingInText(raw: string): boolean {
  return HAS_THINKING_MARKER.test(raw);
}

/** Remove all thinking blocks and stray thinking tags from assistant text. */
export function stripThinkingTags(text: string): string {
  let result = text.replace(thinkingBlockG(), "");
  result = result.replace(THINKING_OPEN_TAIL, "");
  result = result.replace(thinkingOpenTagG(), "");
  result = result.replace(thinkingCloseTagG(), "");
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

export function parseThinkingFromText(raw: string): ThinkingParseResult {
  if (!hasThinkingInText(raw)) {
    return {
      hasThinkingBlock: false,
      thinkingComplete: false,
      thinking: "",
      answer: raw,
    };
  }

  const blocks = [...raw.matchAll(thinkingBlockG())];
  if (blocks.length > 0) {
    const thinking = blocks.map((m) => m[1].trim()).join("\n\n");
    return {
      hasThinkingBlock: true,
      thinkingComplete: true,
      thinking,
      answer: stripThinkingTags(raw),
    };
  }

  const open = raw.match(THINKING_OPEN_TAIL);
  if (open) {
    return {
      hasThinkingBlock: true,
      thinkingComplete: false,
      thinking: open[1].trim(),
      answer: "",
    };
  }

  return {
    hasThinkingBlock: true,
    thinkingComplete: false,
    thinking: "",
    answer: stripThinkingTags(raw),
  };
}

/** Header + raw RAG dump the backend injects into text (not for end users). */
const TOOL_OUTPUT_SECTION_RE =
  /\[TOOL\s+OUTPUT[^\]]*\][^\n]*\n[\s\S]*?(?=\n\s*\*\*References\*\*)/gi;
const TOOL_OUTPUT_MARKER_RE =
  /\[TOOL\s+OUTPUT[^\]]*\][^\n]*(?:\n|$)/gi;

export function sanitizeAssistantText(text: string): string {
  let result = stripThinkingTags(text);
  result = result.replace(TOOL_OUTPUT_SECTION_RE, "\n\n");
  result = result.replace(TOOL_OUTPUT_MARKER_RE, "");
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

export type ThinkingDisplayPhase = "loading" | "thinking" | "answer";

export function getThinkingTargetPhase(
  parsed: ThinkingParseResult,
  isRunning: boolean,
): ThinkingDisplayPhase {
  if (!parsed.hasThinkingBlock) {
    return isRunning ? "loading" : "answer";
  }
  if (!parsed.thinkingComplete) {
    return parsed.thinking.trim() ? "thinking" : "loading";
  }
  if (!parsed.answer.trim()) return "thinking";
  return "answer";
}

const PHASE_ORDER: ThinkingDisplayPhase[] = ["loading", "thinking", "answer"];

export function nextThinkingDisplayPhase(
  current: ThinkingDisplayPhase,
  target: ThinkingDisplayPhase,
): ThinkingDisplayPhase | null {
  const currentIdx = PHASE_ORDER.indexOf(current);
  const targetIdx = PHASE_ORDER.indexOf(target);
  if (targetIdx <= currentIdx) return targetIdx < currentIdx ? target : null;
  return PHASE_ORDER[currentIdx + 1] ?? null;
}
