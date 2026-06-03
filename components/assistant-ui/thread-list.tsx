import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AuiIf,
  ThreadListItemMorePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
} from "@assistant-ui/react";
import {
  ArchiveIcon,
  MoreHorizontalIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import type { FC } from "react";

export const ThreadList: FC = () => {
  return (
    <ThreadListPrimitive.Root className="aui-root aui-thread-list-root flex flex-col">
      <ThreadListNew />
      <p className="mb-1.5 px-2 pt-4 text-xs font-semibold tracking-wide text-[var(--claude-muted)] uppercase">
        Lịch sử
      </p>
      <AuiIf condition={(s) => s.threads.isLoading}>
        <ThreadListSkeleton />
      </AuiIf>
      <AuiIf condition={(s) => !s.threads.isLoading}>
        <ThreadListPrimitive.Items>
          {() => <ThreadListItem />}
        </ThreadListPrimitive.Items>
      </AuiIf>
    </ThreadListPrimitive.Root>
  );
};

const ThreadListNew: FC = () => {
  return (
    <ThreadListPrimitive.New
      render={
        <Button
          variant="outline"
          className="aui-thread-list-new mb-2 h-10 w-full justify-start gap-2 rounded-xl border-[var(--claude-border)] bg-[var(--claude-surface)] px-3 text-sm text-[var(--claude-text)] shadow-sm hover:bg-[#eceae4] data-active:bg-[#eceae4]"
        />
      }
    >
      <PlusIcon className="size-4" />
      Cuộc trò chuyện mới
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
          className="aui-thread-list-skeleton-wrapper flex h-10 items-center px-3"
        >
          <Skeleton className="aui-thread-list-skeleton h-4 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
};

const ThreadListItem: FC = () => {
  return (
    <ThreadListItemPrimitive.Root className="aui-thread-list-item group flex h-10 items-center gap-1 rounded-xl transition-colors hover:bg-[#eceae4] focus-visible:bg-[#eceae4] focus-visible:outline-none data-active:bg-[#e8e4de]">
      <ThreadListItemPrimitive.Trigger className="aui-thread-list-item-trigger flex h-full min-w-0 flex-1 items-center px-3 text-start text-sm">
        <span className="aui-thread-list-item-title min-w-0 flex-1 truncate text-[var(--claude-text)]">
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
            className="aui-thread-list-item-more me-1 size-7 p-0 text-[var(--claude-muted)] opacity-0 transition-opacity group-hover:opacity-100 group-data-active:opacity-100 data-[state=open]:bg-[#e8e4de] data-[state=open]:opacity-100"
          />
        }
      >
        <MoreHorizontalIcon className="size-4" />
        <span className="sr-only">Tùy chọn</span>
      </ThreadListItemMorePrimitive.Trigger>
      <ThreadListItemMorePrimitive.Content
        side="bottom"
        align="start"
        className="aui-thread-list-item-more-content z-50 min-w-36 overflow-hidden rounded-xl border border-[var(--claude-border)] bg-[var(--claude-surface)] p-1 shadow-lg"
      >
        <ThreadListItemPrimitive.Archive
          render={
            <ThreadListItemMorePrimitive.Item className="aui-thread-list-item-more-item flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none select-none hover:bg-[#f5f4f0]" />
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
