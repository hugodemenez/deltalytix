import { staticFile } from "remotion";

/**
 * Sound libraries used by the promo:
 * - `@remotion/sfx` / remotion.media (vendored under public/sfx/remotion)
 * - Kenney Interface Sounds via soundcn, CC0 (public/sfx/kenney)
 *   https://github.com/kapishdima/soundcn/tree/main/assets/kenney_interface-sounds
 */
export const remotionSfx = {
  whoosh: staticFile("sfx/remotion/whoosh.wav"),
  whip: staticFile("sfx/remotion/whip.wav"),
  pageTurn: staticFile("sfx/remotion/page-turn.wav"),
  uiSwitch: staticFile("sfx/remotion/switch.wav"),
  mouseClick: staticFile("sfx/remotion/mouse-click.wav"),
  ding: staticFile("sfx/remotion/ding.wav"),
  shutterModern: staticFile("sfx/remotion/shutter-modern.wav"),
} as const;

export const kenneySfx = {
  click: staticFile("sfx/kenney/click_001.ogg"),
  clickSoft: staticFile("sfx/kenney/click_003.ogg"),
  confirmation: staticFile("sfx/kenney/confirmation_002.ogg"),
  drop: staticFile("sfx/kenney/drop_003.ogg"),
  open: staticFile("sfx/kenney/open_002.ogg"),
  pluck: staticFile("sfx/kenney/pluck_002.ogg"),
  select: staticFile("sfx/kenney/select_004.ogg"),
  switch: staticFile("sfx/kenney/switch_007.ogg"),
  tick: staticFile("sfx/kenney/tick_001.ogg"),
} as const;
