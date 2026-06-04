"use client";

import { GradualRevealText } from "@/components/assistant-ui/gradual-reveal-text";
import {
  WELCOME_CHAR_DELAY_MS,
  WELCOME_HEADLINES,
  WELCOME_ROTATE_PAUSE_MS,
  welcomeRevealDurationMs,
} from "@/lib/chat/welcome-messages";
import { cn } from "@/lib/utils";
import { useEffect, useState, type FC } from "react";

export const WelcomeRotatingHeadline: FC<{ className?: string }> = ({
  className,
}) => {
  const [index, setIndex] = useState(0);
  const headline = WELCOME_HEADLINES[index] ?? WELCOME_HEADLINES[0];

  useEffect(() => {
    const revealMs = welcomeRevealDurationMs(headline, WELCOME_CHAR_DELAY_MS);
    const timer = window.setTimeout(() => {
      setIndex((i) => (i + 1) % WELCOME_HEADLINES.length);
    }, revealMs + WELCOME_ROTATE_PAUSE_MS);

    return () => window.clearTimeout(timer);
  }, [headline, index]);

  return (
    <h1
      className={cn(
        "aui-thread-welcome-message-inner font-serif text-3xl font-normal text-(--claude-text) md:text-4xl",
        className,
      )}
    >
      <span
        key={index}
        className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both inline-block max-w-3xl duration-500"
      >
        <GradualRevealText
          text={headline}
          by="char"
          active
          tokenDelayMs={WELCOME_CHAR_DELAY_MS}
        />
      </span>
    </h1>
  );
};
