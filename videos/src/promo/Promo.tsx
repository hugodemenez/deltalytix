import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { AbsoluteFill } from "remotion";
import { fontFamily } from "../fonts";
import { PromoSfx } from "./PromoSfx";
import { CallToAction } from "./scenes/CallToAction";
import { Headline } from "./scenes/Headline";
import { LogoReveal } from "./scenes/LogoReveal";
import { ProductWell } from "./scenes/ProductWell";
import {
  CTA_FRAMES,
  HEADLINE_FRAMES,
  LOGO_FRAMES,
  PRODUCT_FRAMES,
  SLIDE_FRAMES,
} from "./timing";

export const Promo: React.FC = () => {
  return (
    <AbsoluteFill
      name="Promo"
      style={{
        backgroundColor: "#F7F7F4",
        fontFamily,
      }}
    >
      <PromoSfx />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={LOGO_FRAMES} name="LogoReveal">
          <LogoReveal />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: SLIDE_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={HEADLINE_FRAMES} name="Headline">
          <Headline />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: SLIDE_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={PRODUCT_FRAMES} name="ProductWell">
          <ProductWell />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: SLIDE_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={CTA_FRAMES} name="CallToAction">
          <CallToAction />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
