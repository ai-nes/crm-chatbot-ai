"use client";

import { cn } from "@/lib/utils";
import { memo, useEffect, useMemo, useState, type FC } from "react";

export type RevealGranularity = "char" | "word";
export type RevealDirection = "in" | "out";

function splitRevealTokens(text: string, by: RevealGranularity): string[] {
  if (by === "char") return [...text];
  return text.split(/(\s+)/).filter((part) => part.length > 0);
}

export type GradualRevealTextProps = {
  text: string;
  by?: RevealGranularity;
  /** When false, render plain text (e.g. completed message). */
  active?: boolean;
  /** "in" reveals tokens; "out" hides them in reverse order. */
  direction?: RevealDirection;
  className?: string;
  tokenDelayMs?: number;
};

const GradualRevealTextImpl: FC<GradualRevealTextProps> = ({
  text,
  by = "word",
  active = true,
  direction = "in",
  className,
  tokenDelayMs = 30,
}) => {
  const tokens = useMemo(() => splitRevealTokens(text, by), [text, by]);
  const [committedLength, setCommittedLength] = useState(0);
  const [prevTokenLength, setPrevTokenLength] = useState(0);

  let revealFrom = committedLength;
  if (tokens.length !== prevTokenLength) {
    revealFrom = tokens.length < prevTokenLength ? 0 : committedLength;
    setPrevTokenLength(tokens.length);

    if (direction === "out" || tokens.length < prevTokenLength) {
      setCommittedLength(tokens.length);
    }
  }

  useEffect(() => {
    if (direction !== "in") return;
    if (committedLength >= tokens.length) return;

    const newTokenCount = tokens.length - committedLength;
    const durationMs = Math.max(0, (newTokenCount - 1) * tokenDelayMs + 400);
    const timer = window.setTimeout(
      () => setCommittedLength(tokens.length),
      durationMs,
    );

    return () => window.clearTimeout(timer);
  }, [committedLength, direction, tokenDelayMs, tokens.length]);

  if (!active || tokens.length === 0) {
    return <span className={className}>{text}</span>;
  }

  if (direction === "out") {
    return (
      <span className={cn("inline", className)} aria-label={text}>
        {tokens.map((token, index) => (
          <span
            key={index}
            className={cn(
              "aui-thinking-token inline aui-thinking-token--hide",
              by === "word" && "whitespace-pre-wrap",
            )}
            style={{
              animationDelay: `${(tokens.length - 1 - index) * tokenDelayMs}ms`,
            }}
          >
            {token}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className={cn("inline", className)} aria-label={text}>
      {tokens.map((token, index) => {
        const isNew = index >= revealFrom;
        return (
          <span
            key={index}
            className={cn(
              "aui-thinking-token inline",
              by === "word" && "whitespace-pre-wrap",
              isNew && "aui-thinking-token--reveal",
            )}
            style={
              isNew
                ? {
                    animationDelay: `${(index - revealFrom) * tokenDelayMs}ms`,
                  }
                : undefined
            }
          >
            {token}
          </span>
        );
      })}
    </span>
  );
};

export const GradualRevealText = memo(GradualRevealTextImpl);
