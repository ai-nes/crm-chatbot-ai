"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { logout, setTokenWithRefresh, setupAutoRefresh } from "@/lib/redux/slices/authSlice";

const READY_MESSAGE = "crm-chatbot:ready";
const SET_TOKEN_MESSAGE = "crm-chatbot:set-token";
const LOGOUT_MESSAGE = "crm-chatbot:logout";

type SetTokenMessage = {
  type: typeof SET_TOKEN_MESSAGE;
  accessToken: string;
  refreshToken?: string;
};

function getConfiguredOrigins(): string[] {
  return (process.env.NEXT_PUBLIC_EMBED_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .map((origin) => {
      if (origin === "*") return origin;

      try {
        const url = new URL(origin);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          return null;
        }
        return url.origin;
      } catch {
        return null;
      }
    })
    .filter((origin): origin is string => Boolean(origin));
}

function getReferrerOrigin(): string | null {
  if (typeof document === "undefined" || !document.referrer) return null;

  try {
    return new URL(document.referrer).origin;
  } catch {
    return null;
  }
}

function isAllowedOrigin(origin: string): boolean {
  const configuredOrigins = getConfiguredOrigins();

  if (configuredOrigins.includes("*")) return true;
  if (configuredOrigins.length > 0) return configuredOrigins.includes(origin);

  // Safe default: only accept messages from this app's own origin until an
  // explicit parent origin is configured for a cross-origin embed.
  return origin === window.location.origin;
}

function getReadyTargetOrigin(): string {
  const referrerOrigin = getReferrerOrigin();
  if (referrerOrigin && isAllowedOrigin(referrerOrigin)) return referrerOrigin;

  const configuredOrigins = getConfiguredOrigins().filter((origin) => origin !== "*");
  return configuredOrigins.length === 1 ? configuredOrigins[0]! : "*";
}

function isSetTokenMessage(value: unknown): value is SetTokenMessage {
  if (!value || typeof value !== "object") return false;

  const message = value as Record<string, unknown>;
  return (
    message.type === SET_TOKEN_MESSAGE &&
    typeof message.accessToken === "string" &&
    message.accessToken.length > 0 &&
    (message.refreshToken === undefined || typeof message.refreshToken === "string")
  );
}

export function EmbedAuthBridge() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (window.parent === window) return;

    const targetOrigin = getReadyTargetOrigin();
    window.parent.postMessage({ type: READY_MESSAGE }, targetOrigin);

    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== window.parent || !isAllowedOrigin(event.origin)) {
        return;
      }

      if (isSetTokenMessage(event.data)) {
        const refreshToken = event.data.refreshToken ?? "";
        dispatch(
          setTokenWithRefresh({
            accessToken: event.data.accessToken,
            refreshToken,
          })
        );
        setupAutoRefresh(event.data.accessToken, dispatch);
        return;
      }

      if (
        event.data &&
        typeof event.data === "object" &&
        (event.data as Record<string, unknown>).type === LOGOUT_MESSAGE
      ) {
        dispatch(logout());
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [dispatch]);

  return null;
}
