import { Audio } from "@remotion/media";
import { pageTurn, whoosh } from "@remotion/sfx";
import { Sequence } from "remotion";
import { kenneySfx } from "./sfx";
import { CTA_START, HEADLINE_START, PRODUCT_START } from "./timing";

export const PromoSfx: React.FC = () => {
  return (
    <>
      <Sequence from={4} durationInFrames={24} name="SFX logo confirm">
        <Audio src={kenneySfx.confirmation} volume={0.38} />
      </Sequence>
      <Sequence from={HEADLINE_START} durationInFrames={24} name="SFX headline whoosh">
        <Audio src={whoosh} volume={0.32} />
      </Sequence>
      <Sequence from={PRODUCT_START} durationInFrames={28} name="SFX product open">
        <Audio src={kenneySfx.open} volume={0.42} />
      </Sequence>
      <Sequence from={PRODUCT_START + 16} durationInFrames={16} name="SFX chart tick">
        <Audio src={kenneySfx.tick} volume={0.28} />
      </Sequence>
      <Sequence from={CTA_START} durationInFrames={20} name="SFX CTA click">
        <Audio src={kenneySfx.click} volume={0.4} />
      </Sequence>
      <Sequence from={CTA_START + 4} durationInFrames={24} name="SFX CTA whoosh">
        <Audio src={pageTurn} volume={0.22} />
      </Sequence>
    </>
  );
};
