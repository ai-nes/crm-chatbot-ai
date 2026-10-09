"use client";

import { BrainIcon, Trash2Icon } from "lucide-react";
import { useCallback, useState, type FC } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Note = { id: string; text: string; updated_at: string };

/** Ghi chú trợ lý đã nhớ về người dùng; xóa từng ghi chú để trợ lý quên. */
export const MemoryPanel: FC<{ collapsed?: boolean }> = ({ collapsed = false }) => {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [target, setTarget] = useState<Note | null>(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const res = await fetch("/api/memory", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setNotes((await res.json()) as Note[]);
    } catch {
      setFailed(true);
    }
  }, []);

  const openPanel = () => {
    setOpen(true);
    setNotes(null);
    void load();
  };

  const forget = async (note: Note) => {
    try {
      const res = await fetch(`/api/memory/${encodeURIComponent(note.id)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(String(res.status));
      setNotes((current) => current?.filter((item) => item.id !== note.id) ?? null);
      toast.success("Đã xóa ghi chú");
    } catch {
      toast.error("Không xóa được ghi chú, thử lại sau");
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        className={cn(
          "text-(--claude-muted) hover:bg-[#f3f4f6] hover:text-(--claude-text)",
          collapsed ? "size-9 p-0" : "w-full justify-start gap-2 px-3",
        )}
        onClick={openPanel}
        aria-label="Trí nhớ của trợ lý"
        tabIndex={collapsed ? -1 : undefined}
      >
        <BrainIcon className="size-4 shrink-0" />
        {collapsed ? null : <span className="truncate text-sm">Trí nhớ của trợ lý</span>}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[360px] border-(--claude-border) bg-(--claude-surface) sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Trí nhớ của trợ lý</SheetTitle>
            <SheetDescription>
              Những điều trợ lý đã ghi nhớ về bạn để trả lời sát hơn. Xóa ghi chú nào bạn không muốn trợ lý giữ.
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4">
            {failed ? (
              <div className="flex flex-col items-start gap-2 text-sm text-(--claude-muted)">
                Không tải được trí nhớ.
                <Button variant="outline" size="sm" onClick={() => void load()}>
                  Thử lại
                </Button>
              </div>
            ) : notes === null ? (
              <>
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </>
            ) : notes.length === 0 ? (
              <p className="text-sm text-(--claude-muted)">
                Trợ lý chưa nhớ gì. Hãy nói &ldquo;nhớ giúp tôi…&rdquo; để thêm ghi chú.
              </p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-start gap-2 rounded-lg border border-(--claude-border) bg-(--claude-card) p-3"
                >
                  <p className="min-w-0 flex-1 text-sm wrap-break-word text-(--claude-text)">{note.text}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-(--claude-muted) hover:text-red-600"
                    onClick={() => setTarget(note)}
                    aria-label="Xóa ghi chú"
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={target !== null} onOpenChange={(next) => !next && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa ghi chú này?</AlertDialogTitle>
            <AlertDialogDescription>{target?.text}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (target) void forget(target);
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
