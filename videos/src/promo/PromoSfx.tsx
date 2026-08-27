import { Audio } from "@remotion/media";
import { Sequence } from "remotion";
import { remotionSfx } from "./sfx";
import { CTA_START, HEADLINE_START, PRODUCT_START } from "./timing";

/**
 * One local cue per cut. Remote @remotion/sfx URLs lag the picture;
 * Kenney UI chimes stacked on whooshes. See videos/motion/sound.md.
 */
export const PromoSfx: React.FC = () => {
  return (
    <>
      <Sequence from={HEADLINE_START} durationInFrames={18} name="SFX headline whoosh">
        <Audio src={remotionSfx.whoosh} volume={0.22} />
      </Sequence>
      <Sequence from={PRODUCT_START} durationInFrames={18} name="SFX product whoosh">
        <Audio src={remotionSfx.whoosh} volume={0.2} />
      </Sequence>
      <Sequence from={CTA_START} durationInFrames={16} name="SFX CTA click">
        <Audio src={remotionSfx.mouseClick} volume={0.28} />
      </Sequence>
    </>
  );
};
