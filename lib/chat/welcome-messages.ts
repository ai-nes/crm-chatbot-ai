/** Câu chào trên màn hình trống — chỉnh danh sách tại đây. */
export const WELCOME_HEADLINES = [
  "Tôi có thể hỗ trợ gì cho bạn?",
  "Bạn cần tra cứu khách hàng hay đơn hàng?",
  "Muốn tạo ticket hay cập nhật CRM?",
  "Cần xem báo cáo hay pipeline không?",
  "Bạn muốn hỏi gì về quy trình CRM?",
] as const;

/** Sau khi gõ xong một câu, đợi bao lâu (ms) rồi chuyển câu tiếp theo. */
export const WELCOME_ROTATE_PAUSE_MS = 5_000;

/** Độ trễ giữa mỗi ký tự khi hiện dần. */
export const WELCOME_CHAR_DELAY_MS = 32;

export function welcomeRevealDurationMs(
  text: string,
  charDelayMs = WELCOME_CHAR_DELAY_MS,
): number {
  const n = text.length;
  if (n === 0) return 0;
  return (n - 1) * charDelayMs + 400;
}
