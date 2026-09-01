"use client";

import { ThreadList } from "@/components/assistant-ui/thread-list";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { PanelLeftCloseIcon, PanelLeftIcon, XIcon } from "lucide-react";
import type { FC, ReactNode } from "react";
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_PLUS_INDENT,
  SIDEBAR_TRANSITION_MS,
  SIDEBAR_WIDTH,
  sidebarFadeClass,
  sidebarFadeMs,
} from "@/components/chatbot/sidebar-motion";

export {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_TRANSITION_MS,
  SIDEBAR_WIDTH,
} from "@/components/chatbot/sidebar-motion";

type ChatSidebarProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCollapse?: () => void;
  collapsed?: boolean;
  onExpand?: () => void;
};

const SidebarPanel: FC<{
  onClose: () => void;
  closeLabel: string;
  collapsed?: boolean;
  onExpand?: () => void;
}> = ({ onClose, closeLabel, collapsed = false, onExpand }) => (
  <aside
    data-collapsed={collapsed || undefined}
    className="flex h-full w-full flex-col bg-[#f5f4f0]"
  >
    <div className="relative w-full shrink-0 py-3">
      <div
        className={cn(
          "flex items-center justify-between gap-2 pr-3",
          sidebarFadeClass,
          collapsed ? "opacity-0" : "opacity-100"
        )}
        style={sidebarFadeMs}
        aria-hidden={collapsed}
      >
        <div
          className="flex min-w-0 flex-1 items-center"
          style={{ paddingLeft: SIDEBAR_PLUS_INDENT }}
        >
          <span className="truncate text-sm font-semibold tracking-tight text-(--claude-text)">
            Fpilot
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-(--claude-muted) hover:bg-[#eceae4] hover:text-(--claude-text)"
          onClick={onClose}
          aria-label={closeLabel}
          tabIndex={collapsed ? -1 : undefined}
        >
          {closeLabel === "Đóng sidebar" ? (
            <XIcon className="size-4" />
          ) : (
            <PanelLeftCloseIcon className="size-4" />
          )}
        </Button>
      </div>
      <div
        className={cn(
          "absolute inset-0 flex items-center",
          sidebarFadeClass,
          collapsed ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        style={sidebarFadeMs}
        aria-hidden={!collapsed}
      >
        <div
          className="flex items-center justify-center"
          style={{ width: SIDEBAR_COLLAPSED_WIDTH }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-(--claude-muted) hover:bg-[#eceae4] hover:text-(--claude-text)"
            onClick={onExpand}
            aria-label="Mở rộng sidebar"
            tabIndex={collapsed ? undefined : -1}
          >
            <PanelLeftIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
    <div className="no-scrollbar min-h-0 w-full flex-1 overflow-y-auto pb-4">
      <ThreadList collapsed={collapsed} />
    </div>
  </aside>
);

export const ChatSidebar: FC<ChatSidebarProps> = ({
  open,
  onOpenChange,
  onCollapse,
  collapsed,
  onExpand,
}) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          className="w-[280px] gap-0 border-[var(--claude-border)] bg-[#f5f4f0] p-0"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Danh sách hội thoại</SheetTitle>
          <SidebarPanel onClose={() => onOpenChange?.(false)} closeLabel="Đóng sidebar" />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <SidebarPanel
      collapsed={collapsed}
      onExpand={onExpand}
      onClose={() => onCollapse?.()}
      closeLabel="Thu gọn sidebar"
    />
  );
};

export const ChatSidebarToggle: FC<{
  onClick: () => void;
  className?: string;
}> = ({ onClick, className }) => (
  <Button
    variant="ghost"
    size="icon"
    className={cn(
      "size-8 text-[var(--claude-muted)] hover:bg-[#eceae4] hover:text-[var(--claude-text)]",
      className
    )}
    onClick={onClick}
    aria-label="Mở sidebar"
  >
    <PanelLeftIcon className="size-4" />
  </Button>
);

export const ChatShell: FC<{
  sidebar: ReactNode;
  sidebarExpanded?: boolean;
  children: ReactNode;
}> = ({ sidebar, sidebarExpanded = true, children }) => {
  const isMobile = useIsMobile();
  const sidebarWidth = sidebarExpanded ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH;

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--claude-bg)]">
      {isMobile ? (
        sidebar
      ) : (
        <div
          className="shrink-0 overflow-hidden border-r border-[var(--claude-border)] transition-[width] ease-in-out"
          style={{
            width: sidebarWidth,
            transitionDuration: `${SIDEBAR_TRANSITION_MS}ms`,
          }}
        >
          <div className="h-full w-full">{sidebar}</div>
        </div>
      )}
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
};
