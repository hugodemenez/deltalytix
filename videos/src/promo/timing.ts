export const FPS = 30;
export const CUT_FRAMES = 8;

const after = (start: number, duration: number) =>
  start + duration - CUT_FRAMES;

/** Short brand beat. */
export const LOGO_FRAMES = 24;
/** Copy slam + brief hold. */
export const HEADLINE_FRAMES = 42;
/** Glance, draw, cut — not a long hold on one widget. */
export const STATS_FRAMES = 66;
export const CALENDAR_FRAMES = 72;
export const EQUITY_FRAMES = 72;
export const PNL_FRAMES = 66;
/** Compose → send → think → stream, then a short hold on the full reply. */
export const CHAT_FRAMES = 108;
/** Three account cards from the dashboard Accounts widget. */
export const PROP_FRAMES = 72;
/** Connections page chrome + every direct-sync service. */
export const CONNECTIONS_FRAMES = 90;
/** Assembled dashboard is the payoff. */
export const TOGETHER_FRAMES = 84;
/** Short close. */
export const CTA_FRAMES = 36;

export const HEADLINE_START = after(0, LOGO_FRAMES);
export const STATS_START = after(HEADLINE_START, HEADLINE_FRAMES);
export const CALENDAR_START = after(STATS_START, STATS_FRAMES);
export const EQUITY_START = after(CALENDAR_START, CALENDAR_FRAMES);
export const PNL_START = after(EQUITY_START, EQUITY_FRAMES);
export const CHAT_START = after(PNL_START, PNL_FRAMES);
export const PROP_START = after(CHAT_START, CHAT_FRAMES);
export const CONNECTIONS_START = after(PROP_START, PROP_FRAMES);
export const TOGETHER_START = after(CONNECTIONS_START, CONNECTIONS_FRAMES);
export const CTA_START = after(TOGETHER_START, TOGETHER_FRAMES);

export const PRODUCT_START = STATS_START;

export const PROMO_DURATION_FRAMES =
  LOGO_FRAMES +
  HEADLINE_FRAMES +
  STATS_FRAMES +
  CALENDAR_FRAMES +
  EQUITY_FRAMES +
  PNL_FRAMES +
  CHAT_FRAMES +
  PROP_FRAMES +
  CONNECTIONS_FRAMES +
  TOGETHER_FRAMES +
  CTA_FRAMES -
  CUT_FRAMES * 10;

/** Chart series only — axes never interpolate. */
export const EQUITY_DELAY_FRAMES = 4;
export const EQUITY_DRAW_FRAMES = 42;
export const PNL_DELAY_FRAMES = 4;
export const PNL_BAR_DRAW_FRAMES = 18;
export const PNL_BAR_STAGGER_FRAMES = 3;
