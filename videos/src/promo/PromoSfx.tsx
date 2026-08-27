import { Audio } from "@remotion/media";
import { Sequence } from "remotion";
import { remotionSfx } from "./sfx";
import { CTA_START, HEADLINE_START, PRODUCT_START } from "./timing";

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
      <Sequence from={PRODUCT_START} durationInFrames={30} name="SFX product whoosh">
        <Audio src={remotionSfx.whip} volume={0.85} />
      </Sequence>
      <Sequence from={CTA_START} durationInFrames={30} name="SFX CTA click">
        <Audio src={remotionSfx.mouseClick} volume={0.95} />
      </Sequence>
    </>
  );
};
