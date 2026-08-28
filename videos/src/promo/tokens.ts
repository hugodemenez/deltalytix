/**
 * Dashboard dark tokens (`app/globals.css` `.dark` + `CANVAS_THEME_COLOR.dark`).
 * Canvas and card are the same surface so widgets are not nested wells.
 */
export const tokens = {
  canvas: "#0F0F0F",
  ink: "#FAFAFA",
  muted: "#A3A3A3",
  positive: "#47D1C1",
  action: "#FAFAFA",
  actionInk: "#171717",
  card: "#0F0F0F",
  border: "#3A3A3A",
  today: "#5BA3F8",
  calendarWinBg: "rgba(74, 222, 128, 0.12)",
  calendarWin: "#4ADE80",
  calendarLossBg: "rgba(248, 113, 113, 0.12)",
  calendarLoss: "#F87171",
  chartWin: "#47D1C1",
  chartLoss: "#E87862",
  mutedFill: "#262626",
  line: "rgba(255, 255, 255, 0.1)",
  subtle: "rgba(255, 255, 255, 0.45)",
  destructive: "#F87171",
  progress: "#47A4EB",
  balance: "#2563EB",
  drawdownLine: "#DC2626",
  targetLine: "#16A34A",
} as const;
