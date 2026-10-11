export type ThreadLoadEvent = {
  scope: "list" | "messages";
  threadId?: string;
  status: "loading" | "loaded" | "failed";
  error: string | null;
};
export type ThreadLoadObserver = (event: ThreadLoadEvent) => void;

type LoadEntry = {
  promise: Promise<string | null>;
  resolve: (error: string | null) => void;
  settled: boolean;
};

/** Waiters can register before the runtime mounts its asynchronous history effect. */
export function createThreadLoadTracker() {
  const entries = new Map<string, LoadEntry>();
  const entryFor = (id: string) => {
    let entry = entries.get(id);
    if (!entry) {
      let resolve!: LoadEntry["resolve"];
      const promise = new Promise<string | null>((done) => {
        resolve = done;
      });
      entry = { promise, resolve, settled: false };
      entries.set(id, entry);
    }
    return entry;
  };
  return {
    wait: (id: string, liveMessages = false) =>
      liveMessages && !entries.has(id) ? Promise.resolve(null) : entryFor(id).promise,
    observe: (event: ThreadLoadEvent) => {
      if (event.scope !== "messages" || !event.threadId) return;
      if (event.status === "loading") {
        if (entries.get(event.threadId)?.settled) entries.delete(event.threadId);
        entryFor(event.threadId);
      } else {
        const entry = entryFor(event.threadId);
        entry.settled = true;
        entry.resolve(event.error);
      }
    },
  };
}

/** Remote runtime logs failures; expose their outcome to the compact history view too. */
export async function observeThreadLoad<T>(
  scope: ThreadLoadEvent["scope"],
  observer: ThreadLoadObserver | undefined,
  load: () => Promise<T>,
  threadId?: string
): Promise<T> {
  observer?.({ scope, threadId, status: "loading", error: null });
  try {
    const result = await load();
    observer?.({ scope, threadId, status: "loaded", error: null });
    return result;
  } catch (error) {
    observer?.({
      scope,
      threadId,
      status: "failed",
      error:
        scope === "list"
          ? "Không tải được lịch sử trò chuyện. Vui lòng thử lại."
          : "Không tải được cuộc trò chuyện. Vui lòng tải lại trang để thử lại.",
    });
    throw error;
  }
}
