"use client";

import { ReactNode } from "react";
import { ReduxProvider } from "./reduxProvider";
import { QueryProvider } from "./queryProvider";
import { SignalRProvider } from "./signalRProvider";
import { useAuthSyncAcrossTabs } from "@/hooks/useAuthSyncAcrossTabs";

function AuthSyncProvider({ children }: { children: ReactNode }) {
  useAuthSyncAcrossTabs();
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ReduxProvider>
      <QueryProvider>
        <SignalRProvider>
          <AuthSyncProvider>{children}</AuthSyncProvider>
        </SignalRProvider>
      </QueryProvider>
    </ReduxProvider>
  );
}
