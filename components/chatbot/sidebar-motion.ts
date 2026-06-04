export const SIDEBAR_WIDTH = 260;
export const SIDEBAR_COLLAPSED_WIDTH = 56;
export const SIDEBAR_PLUS_CIRCLE = 24;
export const SIDEBAR_PLUS_GLYPH = 14;
/** Căn chữ thẳng hàng với dấu + (vòng tròn size-6, icon size-3.5, giữa rail) */
export const SIDEBAR_PLUS_INDENT =
  (SIDEBAR_COLLAPSED_WIDTH - SIDEBAR_PLUS_CIRCLE) / 2 +
  (SIDEBAR_PLUS_CIRCLE - SIDEBAR_PLUS_GLYPH) / 2;
export const SIDEBAR_TRANSITION_MS = 300;

export const sidebarFadeMs = {
  transitionDuration: `${SIDEBAR_TRANSITION_MS}ms`,
};

/** Crossfade expanded ↔ collapsed cùng thời lượng với thu width */
export const sidebarFadeClass = "transition-opacity ease-in-out";
