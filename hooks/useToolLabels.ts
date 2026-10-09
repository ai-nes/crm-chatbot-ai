"use client";

import { useEffect, useState } from "react";

type Labels = Record<string, string>;

let cached: Promise<Labels> | null = null;

function loadLabels(): Promise<Labels> {
  cached ??= fetch("/api/tools", { cache: "no-store" })
    .then((res) => (res.ok ? (res.json() as Promise<Labels>) : {}))
    .catch(() => ({}))
    .then((labels) => {
      // Lỗi tạm thời (chưa đăng nhập, mạng) thì lần sau thử lại thay vì nhớ kết quả rỗng.
      if (Object.keys(labels).length === 0) cached = null;
      return labels;
    });
  return cached;
}

/** Nhãn tiếng Việt của công cụ, tải một lần mỗi phiên trang; chưa có thì dùng tên gốc. */
export function useToolLabels(): Labels {
  const [labels, setLabels] = useState<Labels>({});
  useEffect(() => {
    let live = true;
    void loadLabels().then((next) => {
      if (live) setLabels(next);
    });
    return () => {
      live = false;
    };
  }, []);
  return labels;
}
