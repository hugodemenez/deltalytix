export const FPS = 30;
export const SLIDE_FRAMES = 8;

const after = (start: number, duration: number) =>
  start + duration - SLIDE_FRAMES;

/** Short brand beat — in by ~0.4s, then cut. */
export const LOGO_FRAMES = 30;
/** Copy slam + brief hold. */
export const HEADLINE_FRAMES = 54;
/** One widget per scene so each can draw and be read. */
export const STATS_FRAMES = 150;
export const CALENDAR_FRAMES = 180;
export const EQUITY_FRAMES = 180;
export const PNL_FRAMES = 150;
/** Assembled dashboard after the feature beats. */
export const TOGETHER_FRAMES = 96;
/** Short close. */
export const CTA_FRAMES = 42;

export const HEADLINE_START = after(0, LOGO_FRAMES);
export const STATS_START = after(HEADLINE_START, HEADLINE_FRAMES);
export const CALENDAR_START = after(STATS_START, STATS_FRAMES);
export const EQUITY_START = after(CALENDAR_START, CALENDAR_FRAMES);
export const PNL_START = after(EQUITY_START, EQUITY_FRAMES);
export const TOGETHER_START = after(PNL_START, PNL_FRAMES);
export const CTA_START = after(TOGETHER_START, TOGETHER_FRAMES);

export const PRODUCT_START = STATS_START;

export const PROMO_DURATION_FRAMES =
  LOGO_FRAMES +
  HEADLINE_FRAMES +
  STATS_FRAMES +
  CALENDAR_FRAMES +
  EQUITY_FRAMES +
  PNL_FRAMES +
  TOGETHER_FRAMES +
  CTA_FRAMES -
  SLIDE_FRAMES * 7;

/** Chart series only — axes never interpolate. */
export const EQUITY_DELAY_FRAMES = 8;
export const EQUITY_DRAW_FRAMES = 108;
export const PNL_DELAY_FRAMES = 10;
export const PNL_BAR_DRAW_FRAMES = 42;
export const PNL_BAR_STAGGER_FRAMES = 6;
