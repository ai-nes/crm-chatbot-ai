"use client";

import { ReactNode } from "react";
import { useSignalR } from "@/hooks/useSignalR";
import { useSignalRNotifications } from "@/hooks/useSignalRNotifications";

export function SignalRProvider({ children }: { children: ReactNode }) {
  useSignalR();
  useSignalRNotifications();
  return <>{children}</>;
}
