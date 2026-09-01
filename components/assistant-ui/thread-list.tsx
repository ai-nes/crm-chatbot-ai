import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_PLUS_INDENT,
  sidebarFadeClass,
  sidebarFadeMs,
} from "@/components/chatbot/sidebar-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AuiIf,
  ThreadListItemMorePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
} from "@assistant-ui/react";
import { ArchiveIcon, MoreHorizontalIcon, PlusIcon, TrashIcon } from "lucide-react";
import type { FC } from "react";
import { cn } from "@/lib/utils";

type ThreadListProps = {
  collapsed?: boolean;
};

export const ThreadList: FC<ThreadListProps> = ({ collapsed = false }) => {
  return (
    <ThreadListPrimitive.Root className="aui-root aui-thread-list-root flex flex-col">
      <ThreadListNew collapsed={collapsed} />
      <div
        className={cn(
          "flex w-full flex-col pr-2",
          sidebarFadeClass,
          collapsed ? "pointer-events-none opacity-0" : "opacity-100"
        )}
        style={sidebarFadeMs}
        aria-hidden={collapsed}
      >
        <p
          className="mb-1.5 w-full pt-4 text-xs font-semibold tracking-wide text-(--claude-muted) uppercase"
          style={{ paddingLeft: SIDEBAR_PLUS_INDENT }}
        >
          Lịch sử
        </p>
        <AuiIf condition={(s) => s.threads.isLoading}>
          <ThreadListSkeleton />
        </AuiIf>
        <AuiIf condition={(s) => !s.threads.isLoading}>
          <ThreadListPrimitive.Items>{() => <ThreadListItem />}</ThreadListPrimitive.Items>
        </AuiIf>
      </div>
    </ThreadListPrimitive.Root>
  );
};

const ThreadListNew: FC<{ collapsed?: boolean }> = ({ collapsed = false }) => {
  return (
    <ThreadListPrimitive.New
      render={
        <button
          type="button"
          className="aui-thread-list-new mb-2 flex h-10 w-full min-w-0 items-center rounded-none text-left transition-colors hover:bg-[#f3f4f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--claude-accent)/25 data-active:bg-[#f3f4f6]"
        />
      }
    >
      <span
        className="flex h-10 shrink-0 items-center justify-center"
        style={{ width: SIDEBAR_COLLAPSED_WIDTH }}
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-[#f3f4f6] text-(--claude-text)">
          <PlusIcon className="size-3.5" />
        </span>
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate pr-2 pl-0.5 text-sm text-(--claude-text) -ml-3.5",
          sidebarFadeClass,
          collapsed ? "opacity-0" : "opacity-100"
        )}
        style={sidebarFadeMs}
        aria-hidden={collapsed}
      >
        Cuộc trò chuyện mới
      </span>
    </ThreadListPrimitive.New>
  );
};

const ThreadListSkeleton: FC = () => {
  return (
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          role="status"
          aria-label="Đang tải hội thoại"
          className="aui-thread-list-skeleton-wrapper flex h-10 items-center pr-3"
          style={{ paddingLeft: SIDEBAR_PLUS_INDENT }}
        >
          <Skeleton className="aui-thread-list-skeleton h-4 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
};

const ThreadListItem: FC = () => {
  return (
    <ThreadListItemPrimitive.Root className="aui-thread-list-item group flex h-10 items-center gap-1 rounded-xl transition-colors hover:bg-[#f3f4f6] focus-visible:bg-[#f3f4f6] focus-visible:outline-none data-active:bg-[#f3f4f6]">
      <ThreadListItemPrimitive.Trigger
        className="aui-thread-list-item-trigger flex h-full min-w-0 flex-1 items-center pr-3 text-start text-sm"
        style={{ paddingLeft: SIDEBAR_PLUS_INDENT }}
      >
        <span className="aui-thread-list-item-title min-w-0 flex-1 truncate text-(--claude-text)">
          <ThreadListItemPrimitive.Title fallback="Cuộc trò chuyện mới" />
        </span>
      </ThreadListItemPrimitive.Trigger>
      <ThreadListItemMore />
    </ThreadListItemPrimitive.Root>
  );
};

const ThreadListItemMore: FC = () => {
  return (
    <ThreadListItemMorePrimitive.Root>
      <ThreadListItemMorePrimitive.Trigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="aui-thread-list-item-more me-1 size-7 p-0 text-(--claude-muted) opacity-0 transition-opacity group-hover:opacity-100 group-data-active:opacity-100 data-[state=open]:bg-[#f3f4f6] data-[state=open]:opacity-100"
          />
        }
      >
        <MoreHorizontalIcon className="size-4" />
        <span className="sr-only">Tùy chọn</span>
      </ThreadListItemMorePrimitive.Trigger>
      <ThreadListItemMorePrimitive.Content
        side="bottom"
        align="start"
        className="aui-thread-list-item-more-content z-50 min-w-36 overflow-hidden rounded-xl border border-(--claude-border) bg-(--claude-surface) p-1 shadow-lg"
      >
        <ThreadListItemPrimitive.Archive
          render={
            <ThreadListItemMorePrimitive.Item className="aui-thread-list-item-more-item flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none select-none hover:bg-[#f3f4f6]" />
          }
        >
          <ArchiveIcon className="size-4" />
          Lưu trữ
        </ThreadListItemPrimitive.Archive>
        <ThreadListItemPrimitive.Delete
          render={
            <ThreadListItemMorePrimitive.Item className="aui-thread-list-item-more-item flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-red-600 outline-none select-none hover:bg-red-50" />
          }
        >
          <TrashIcon className="size-4" />
          Xóa
        </ThreadListItemPrimitive.Delete>
      </ThreadListItemMorePrimitive.Content>
    </ThreadListItemMorePrimitive.Root>
  );
};
