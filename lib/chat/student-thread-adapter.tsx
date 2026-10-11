"use client";

import type { RemoteThreadListAdapter } from "@assistant-ui/core";
import { createServerThreadAdapter } from "@/lib/chat/server-thread-adapter";
import type { ThreadLoadObserver } from "@/lib/chat/thread-load-observer";

/**
 * Compatibility wrapper: student-opened chats use the same history as general
 * chats. The server binds student context to a thread when its first turn is
 * created and restores that immutable context when the thread is reopened.
 */
export function createStudentThreadAdapter(
  _studentId: string,
  observer?: ThreadLoadObserver,
): RemoteThreadListAdapter {
  return createServerThreadAdapter(observer);
}
