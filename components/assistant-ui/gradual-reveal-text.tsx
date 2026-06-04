"use client";

import { cn } from "@/lib/utils";
import { memo, useLayoutEffect, useMemo, useRef, type FC } from "react";

export type RevealGranularity = "char" | "word";

function splitRevealTokens(text: string, by: RevealGranularity): string[] {
  if (by === "char") return [...text];
  return text.split(/(\s+)/).filter((part) => part.length > 0);
}

export type GradualRevealTextProps = {
  text: string;
  by?: RevealGranularity;
  /** When false, render plain text (e.g. completed message). */
  active?: boolean;
  className?: string;
  tokenDelayMs?: number;
};

const GradualRevealTextImpl: FC<GradualRevealTextProps> = ({
  text,
  by = "word",
  active = true,
  className,
  tokenDelayMs = 30,
}) => {
  const tokens = useMemo(() => splitRevealTokens(text, by), [text, by]);
  const revealedCountRef = useRef(0);

  useLayoutEffect(() => {
    revealedCountRef.current = tokens.length;
  }, [tokens.length]);

  if (!active || tokens.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const revealFrom = revealedCountRef.current;

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
