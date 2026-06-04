"use client";

import { PERSIST_CHAT_TO_LOCAL_STORAGE } from "@/lib/chat/persist-config";

const STORAGE_PREFIX = "@crm-chatbot:";
const SEED_FLAG_KEY = `${STORAGE_PREFIX}mock-seeded`;

const DEMO_THREAD_ID = "demo-thread-crm-001";

const DEMO_THREADS = [
  {
    remoteId: DEMO_THREAD_ID,
    status: "regular" as const,
    title: "Tra cứu KH Nguyễn Văn A",
  },
];

const DEMO_MESSAGES = [
  {
    id: "demo-user-1",
    parent_id: null,
    format: "ai-sdk/v6",
    content: {
      role: "user",
      parts: [
        {
          type: "text",
          text: "Tra cứu thông tin khách hàng Nguyễn Văn A",
        },
      ],
    },
  },
  {
    id: "demo-assistant-1",
    parent_id: "demo-user-1",
    format: "ai-sdk/v6",
    content: {
      role: "assistant",
      parts: [
        {
          type: "text",
          text: `Đã tra cứu thông tin khách hàng **Nguyễn Văn A**:

| Trường | Giá trị |
|--------|---------|
| Mã KH | KH-1024 |
| Email | nguyenvana@email.com |
| SĐT | 0901 234 567 |
| Phân loại | VIP |
| Doanh số YTD | 245.000.000 ₫ |

**Lịch sử gần đây**
1. 28/05 — Mua gói Enterprise (50 user)
2. 15/04 — Ticket #TK-8891 đã xử lý xong
3. 02/03 — Demo tính năng báo cáo pipeline

Bạn muốn tôi tạo ticket hay gửi email follow-up?`,
        },
      ],
    },
  },
];

export function seedMockDemoIfNeeded() {
  if (!PERSIST_CHAT_TO_LOCAL_STORAGE) return;
  if (process.env.NEXT_PUBLIC_MOCK_CHAT !== "true") return;
  if (typeof window === "undefined") return;

  const existing = localStorage.getItem(`${STORAGE_PREFIX}threads`);
  if (existing) {
    try {
      const threads = JSON.parse(existing) as unknown[];
      if (Array.isArray(threads) && threads.length > 0) return;
    } catch {
      // ignore invalid storage
    }
  }

  localStorage.setItem(`${STORAGE_PREFIX}threads`, JSON.stringify(DEMO_THREADS));
  localStorage.setItem(
    `${STORAGE_PREFIX}messages:${DEMO_THREAD_ID}`,
    JSON.stringify(DEMO_MESSAGES),
  );
  localStorage.setItem(SEED_FLAG_KEY, "1");
}
