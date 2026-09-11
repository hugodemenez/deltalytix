import { createContext, useContext, type ReactNode } from "react";

export type PromoTheme = "dark" | "light";
export type PromoVariant = "ads" | "landing";

export type PromoTokens = {
  readonly theme: PromoTheme;
  readonly logoTone: "white" | "black";
  readonly canvas: string;
  readonly ink: string;
  readonly muted: string;
  readonly positive: string;
  readonly action: string;
  readonly actionInk: string;
  readonly card: string;
  readonly border: string;
  readonly today: string;
  readonly calendarWinBg: string;
  readonly calendarWin: string;
  readonly calendarLossBg: string;
  readonly calendarLoss: string;
  readonly chartWin: string;
  readonly chartLoss: string;
  readonly mutedFill: string;
  readonly line: string;
  readonly subtle: string;
  readonly destructive: string;
  readonly progress: string;
  readonly balance: string;
  readonly drawdownLine: string;
  readonly targetLine: string;
};

/**
 * Dashboard dark tokens (`app/globals.css` `.dark` + `CANVAS_THEME_COLOR.dark`).
 * Canvas and card are the same surface so widgets are not nested wells.
 */
export const darkTokens: PromoTokens = {
  theme: "dark",
  logoTone: "white",
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
};

/**
 * Dashboard light tokens (`:root` / `.light` + `CANVAS_THEME_COLOR.light`).
 * Same one-surface rule: canvas and cards share `#F5F5F5`, hairline `#E5E5E5`.
 */
export const lightTokens: PromoTokens = {
  theme: "light",
  logoTone: "black",
  canvas: "#F5F5F5",
  ink: "#0A0A0A",
  muted: "#737373",
  positive: "#2A9D90",
  action: "#171717",
  actionInk: "#FAFAFA",
  card: "#F5F5F5",
  border: "#E5E5E5",
  today: "#3B82F6",
  calendarWinBg: "#F0FDF4",
  calendarWin: "#16A34A",
  calendarLossBg: "#FEF2F2",
  calendarLoss: "#DC2626",
  chartWin: "#2A9D90",
  chartLoss: "#E76E50",
  mutedFill: "#E5E5E5",
  line: "rgba(0, 0, 0, 0.1)",
  subtle: "rgba(0, 0, 0, 0.45)",
  destructive: "#EF4444",
  progress: "#0B64F4",
  balance: "#2563EB",
  drawdownLine: "#DC2626",
  targetLine: "#16A34A",
};

export const tokensByTheme = {
  dark: darkTokens,
  light: lightTokens,
} as const;

/** Ads default. Isolated Studio scenes use this without a provider. */
export const tokens = darkTokens;

const PromoThemeContext = createContext<PromoTokens>(darkTokens);

export function PromoThemeProvider({
  theme,
  children,
}: {
  readonly theme: PromoTheme;
  readonly children: ReactNode;
}) {
  return (
    <PromoThemeContext.Provider value={tokensByTheme[theme]}>
      {children}
    </PromoThemeContext.Provider>
  );
}

export function usePromoTokens(): PromoTokens {
  return useContext(PromoThemeContext);
}
