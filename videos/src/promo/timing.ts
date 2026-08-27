export const FPS = 30;
export const SLIDE_FRAMES = 8;

/** Short brand beat — in by ~0.4s, then cut. */
export const LOGO_FRAMES = 30;
/** Copy slam + brief hold. */
export const HEADLINE_FRAMES = 54;
/** Long enough for a slow equity draw and a readable hold. */
export const PRODUCT_FRAMES = 210;
/** Short close. */
export const CTA_FRAMES = 42;

export const HEADLINE_START = LOGO_FRAMES - SLIDE_FRAMES;
export const PRODUCT_START = HEADLINE_START + HEADLINE_FRAMES - SLIDE_FRAMES;
export const CTA_START = PRODUCT_START + PRODUCT_FRAMES - SLIDE_FRAMES;

export const PROMO_DURATION_FRAMES =
  LOGO_FRAMES + HEADLINE_FRAMES + PRODUCT_FRAMES + CTA_FRAMES - SLIDE_FRAMES * 3;

/** Chart series only — axes never interpolate. */
export const EQUITY_DELAY_FRAMES = 12;
export const EQUITY_DRAW_FRAMES = 72;
export const PNL_DELAY_FRAMES = 24;
export const PNL_BAR_DRAW_FRAMES = 36;
export const PNL_BAR_STAGGER_FRAMES = 5;
