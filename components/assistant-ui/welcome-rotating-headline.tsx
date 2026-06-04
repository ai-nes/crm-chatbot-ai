"use client";

import { GradualRevealText } from "@/components/assistant-ui/gradual-reveal-text";
import {
  WELCOME_CHAR_DELAY_MS,
  WELCOME_ROTATE_PAUSE_MS,
  getWelcomeHeadlines,
  welcomeStaggerDurationMs,
} from "@/lib/chat/welcome-messages";
import { cn } from "@/lib/utils";
import { useEffect, useState, type FC } from "react";

type HeadlinePhase = "enter" | "hold" | "exit";

export const WelcomeRotatingHeadline: FC<{ className?: string }> = ({
  className,
}) => {
  const [headlines, setHeadlines] = useState<readonly string[]>([
    "Chào buổi sáng, tôi giúp gì được?",
  ]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<HeadlinePhase>("enter");

  useEffect(() => {
    setHeadlines(getWelcomeHeadlines());
    setIndex(0);
    setPhase("enter");
  }, []);

  const headline = headlines[index] ?? headlines[0];
  const staggerMs = welcomeStaggerDurationMs(headline, WELCOME_CHAR_DELAY_MS);

  useEffect(() => {
    if (phase === "enter") {
      const timer = window.setTimeout(() => setPhase("hold"), staggerMs);
      return () => window.clearTimeout(timer);
    }

    if (phase === "hold") {
      const timer = window.setTimeout(() => setPhase("exit"), WELCOME_ROTATE_PAUSE_MS);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setIndex((i) => (i + 1) % headlines.length);
      setPhase("enter");
    }, staggerMs);

    return () => window.clearTimeout(timer);
  }, [phase, staggerMs, headlines.length]);

  return (
    <h1
      className={cn(
        "aui-thread-welcome-message-inner w-full max-w-full text-center font-serif text-2xl font-normal text-balance text-(--claude-text) sm:text-3xl md:text-4xl md:text-nowrap",
        className,
      )}
    >
      <span className="block w-full max-w-full min-w-0 px-1">
        {phase === "hold" ? (
          <span>{headline}</span>
        ) : (
          <GradualRevealText
            key={index}
            text={headline}
            by="char"
            active
            direction={phase === "exit" ? "out" : "in"}
            tokenDelayMs={WELCOME_CHAR_DELAY_MS}
          />
        )}
      </span>
    </h1>
  );
};
