export const FPS = 30;
export const CUT_FRAMES = 8;

const after = (start: number, duration: number) =>
  start + duration - CUT_FRAMES;

/** Short brand beat. */
export const LOGO_FRAMES = 24;
/** Copy slam + brief hold. */
export const HEADLINE_FRAMES = 42;
/** Glance, then into the scrolling dashboard. */
export const STATS_FRAMES = 66;
/** Isolated Studio comps for the widgets that now live on the dashboard. */
export const CALENDAR_FRAMES = 72;
export const EQUITY_FRAMES = 72;
export const PNL_FRAMES = 66;
export const CHAT_FRAMES = 108;
export const PROP_FRAMES = 72;
export const CONNECTIONS_FRAMES = 90;
/** Short close. */
export const CTA_FRAMES = 36;

/** One viewport of the scrolling dashboard (matches composition height). */
export const DASH_PAGE_PX = 1080;
/** Duration of each page-to-page camera move. */
export const DASH_SCROLL_FRAMES = 45;
/** Hold the assembled calendar + charts while they draw. */
export const DASH_OVERVIEW_HOLD = 78;
/** Chat needs the full compose → stream window. */
export const DASH_CHAT_HOLD = CHAT_FRAMES;
export const DASH_PROP_HOLD = PROP_FRAMES;
export const DASH_CONN_HOLD = CONNECTIONS_FRAMES;

export const DASH_SCROLL_TO_CHAT = DASH_OVERVIEW_HOLD;
export const DASH_CHAT_AT = DASH_SCROLL_TO_CHAT + DASH_SCROLL_FRAMES;
export const DASH_SCROLL_TO_PROP = DASH_CHAT_AT + DASH_CHAT_HOLD;
export const DASH_PROP_AT = DASH_SCROLL_TO_PROP + DASH_SCROLL_FRAMES;
export const DASH_SCROLL_TO_CONN = DASH_PROP_AT + DASH_PROP_HOLD;
export const DASH_CONN_AT = DASH_SCROLL_TO_CONN + DASH_SCROLL_FRAMES;
export const DASHBOARD_FRAMES = DASH_CONN_AT + DASH_CONN_HOLD;

export const HEADLINE_START = after(0, LOGO_FRAMES);
export const STATS_START = after(HEADLINE_START, HEADLINE_FRAMES);
export const DASHBOARD_START = after(STATS_START, STATS_FRAMES);
export const CHAT_START = DASHBOARD_START + DASH_CHAT_AT;
export const PROP_START = DASHBOARD_START + DASH_PROP_AT;
export const CONNECTIONS_START = DASHBOARD_START + DASH_CONN_AT;
export const CTA_START = after(DASHBOARD_START, DASHBOARD_FRAMES);

export const PRODUCT_START = STATS_START;

export const PROMO_DURATION_FRAMES =
  LOGO_FRAMES +
  HEADLINE_FRAMES +
  STATS_FRAMES +
  DASHBOARD_FRAMES +
  CTA_FRAMES -
  CUT_FRAMES * 4;

/** Chart series only — axes never interpolate. */
export const EQUITY_DELAY_FRAMES = 4;
export const EQUITY_DRAW_FRAMES = 42;
export const PNL_DELAY_FRAMES = 4;
export const PNL_BAR_DRAW_FRAMES = 18;
export const PNL_BAR_STAGGER_FRAMES = 3;
