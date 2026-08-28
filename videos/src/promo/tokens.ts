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
} as const;
