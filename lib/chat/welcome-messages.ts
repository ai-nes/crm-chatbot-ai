/** Câu thăm hỏi xoay vòng — ngắn gọn, một dòng. */
export const WELCOME_HEADLINES = [
  "Hôm nay bạn thế nào?",
  "Mọi việc ổn chứ?",
  "Bạn có khỏe không?",
  "Tôi sẵn sàng lắng nghe",
  "Chúc bạn một ngày vui",
] as const;

export const WELCOME_ROTATE_PAUSE_MS = 5_000;

export const WELCOME_CHAR_DELAY_MS = 32;


export function getTimeGreeting(date = new Date()): string {
  const hour = date.getHours();

  if (hour < 12) return "Chào buổi sáng";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export function getWelcomeHeadlines(date = new Date()): readonly string[] {
  const greeting = getTimeGreeting(date);

  return [
    `${greeting}, tôi giúp gì được?`,
    `${greeting}! Bạn khỏe không?`,
    ...WELCOME_HEADLINES,
  ];
}

export function welcomeStaggerDurationMs(
  text: string,
  charDelayMs = WELCOME_CHAR_DELAY_MS,
): number {
  const n = text.length;
  if (n === 0) return 0;
  return (n - 1) * charDelayMs + 400;
}

/** @deprecated Use welcomeStaggerDurationMs */
export const welcomeRevealDurationMs = welcomeStaggerDurationMs;
