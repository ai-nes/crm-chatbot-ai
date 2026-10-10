"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type ToolLabels = Record<string, string>;

const ToolLabelsContext = createContext<ToolLabels>({});

export function ToolLabelsProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<ToolLabels>({});

  useEffect(() => {
    let active = true;

    fetch("/api/tools", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return {};
        const value: unknown = await response.json();
        if (!value || typeof value !== "object" || Array.isArray(value)) return {};
        return Object.fromEntries(
          Object.entries(value).filter((entry): entry is [string, string] =>
            typeof entry[1] === "string",
          ),
        );
      })
      .then((nextLabels) => {
        if (active) setLabels(nextLabels);
      })
      .catch(() => {
        // Keep the built-in Vietnamese labels when CRM is temporarily unavailable.
      });

    return () => {
      active = false;
    };
  }, []);

  return <ToolLabelsContext.Provider value={labels}>{children}</ToolLabelsContext.Provider>;
}

export function useToolLabels() {
  return useContext(ToolLabelsContext);
}
