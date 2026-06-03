"use client";

import { AppLogo } from "@/components/chatbot/app-logo";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { PanelLeftCloseIcon, PanelLeftIcon, XIcon } from "lucide-react";
import type { FC, ReactNode } from "react";

type ChatSidebarProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCollapse?: () => void;
};

const SidebarPanel: FC<{ onClose: () => void; closeLabel: string }> = ({
  onClose,
  closeLabel,
}) => (
  <aside className="flex h-full w-full flex-col bg-[#f5f4f0]">
    <div className="flex items-center justify-between gap-2 px-3 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <AppLogo priority className="h-7 max-w-32.5" />
        <span className="truncate text-sm font-semibold tracking-tight text-(--claude-text)">
          CRM Chatbot
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-(--claude-muted) hover:bg-[#eceae4] hover:text-(--claude-text)"
        onClick={onClose}
        aria-label={closeLabel}
      >
        {closeLabel === "Đóng sidebar" ? (
          <XIcon className="size-4" />
        ) : (
          <PanelLeftCloseIcon className="size-4" />
        )}
      </Button>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
      <ThreadList />
    </div>
  </aside>
);

export const ChatSidebar: FC<ChatSidebarProps> = ({
  open,
  onOpenChange,
  onCollapse,
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
          <SidebarPanel
            onClose={() => onOpenChange?.(false)}
            closeLabel="Đóng sidebar"
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <SidebarPanel onClose={() => onCollapse?.()} closeLabel="Thu gọn sidebar" />
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
      className,
    )}
    onClick={onClick}
    aria-label="Mở sidebar"
  >
    <PanelLeftIcon className="size-4" />
  </Button>
);

const SIDEBAR_WIDTH = 260;

export const ChatShell: FC<{
  sidebar: ReactNode;
  sidebarExpanded?: boolean;
  children: ReactNode;
}> = ({ sidebar, sidebarExpanded = true, children }) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--claude-bg)]">
      {isMobile ? (
        sidebar
      ) : (
        <div
          className={cn(
            "shrink-0 overflow-hidden border-[var(--claude-border)] transition-[width,border-color] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
            sidebarExpanded
              ? "w-[260px] border-r"
              : "pointer-events-none w-0 border-r-0",
          )}
          aria-hidden={!sidebarExpanded}
        >
          <div
            className={cn(
              "h-full transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
              sidebarExpanded
                ? "translate-x-0 opacity-100"
                : "-translate-x-3 opacity-0",
            )}
            style={{ width: SIDEBAR_WIDTH }}
          >
            {sidebar}
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
};
