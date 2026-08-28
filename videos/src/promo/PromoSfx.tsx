import { Audio } from "@remotion/media";
import { Sequence } from "remotion";
import { kenneySfx, remotionSfx } from "./sfx";
import {
  CHAT_START,
  CONNECTIONS_START,
  CTA_START,
  DASHBOARD_START,
  DASH_SCROLL_TO_CHAT,
  DASH_SCROLL_TO_CONN,
  DASH_SCROLL_TO_PROP,
  HEADLINE_START,
  PROP_START,
  STATS_START,
} from "./timing";

/**
 * Local WAVs at full mix level. Sequence windows are 1s so @remotion/media
 * can decode; do not clamp to 16–18 frames (that ate the whoosh).
 * See videos/motion/sound.md.
 */
export const PromoSfx: React.FC = () => {
  return (
    <>
      <Sequence durationInFrames={30} name="SFX logo">
        <Audio src={remotionSfx.ding} volume={0.55} />
      </Sequence>
      <Sequence from={HEADLINE_START} durationInFrames={30} name="SFX headline whoosh">
        <Audio src={remotionSfx.pageTurn} volume={0.9} />
      </Sequence>
      <Sequence from={STATS_START} durationInFrames={30} name="SFX stats">
        <Audio src={remotionSfx.whip} volume={0.85} />
      </Sequence>
      <Sequence from={DASHBOARD_START} durationInFrames={30} name="SFX dashboard">
        <Audio src={remotionSfx.pageTurn} volume={0.75} />
      </Sequence>
      <Sequence from={DASHBOARD_START + DASH_SCROLL_TO_CHAT} durationInFrames={30} name="SFX scroll chat">
        <Audio src={remotionSfx.whoosh} volume={0.85} />
      </Sequence>
      <Sequence from={CHAT_START} durationInFrames={30} name="SFX chat">
        <Audio src={kenneySfx.confirmation} volume={0.85} />
      </Sequence>
      <Sequence from={DASHBOARD_START + DASH_SCROLL_TO_PROP} durationInFrames={30} name="SFX scroll accounts">
        <Audio src={remotionSfx.whoosh} volume={0.85} />
      </Sequence>
      <Sequence from={PROP_START} durationInFrames={30} name="SFX prop firm">
        <Audio src={kenneySfx.open} volume={0.85} />
      </Sequence>
      <Sequence from={DASHBOARD_START + DASH_SCROLL_TO_CONN} durationInFrames={30} name="SFX scroll connections">
        <Audio src={remotionSfx.uiSwitch} volume={0.85} />
      </Sequence>
      <Sequence from={CONNECTIONS_START} durationInFrames={30} name="SFX connections">
        <Audio src={kenneySfx.select} volume={0.85} />
      </Sequence>
      <Sequence from={CTA_START} durationInFrames={30} name="SFX CTA click">
        <Audio src={remotionSfx.mouseClick} volume={0.95} />
      </Sequence>
    </>
  );
};
