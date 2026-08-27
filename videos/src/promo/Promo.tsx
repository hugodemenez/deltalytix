import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { AbsoluteFill } from "remotion";
import { fontFamily } from "../fonts";
import { CallToAction } from "./scenes/CallToAction";
import { Headline } from "./scenes/Headline";
import { LogoReveal } from "./scenes/LogoReveal";
import { ProductWell } from "./scenes/ProductWell";

export const Promo: React.FC = () => {
  return (
    <AbsoluteFill
      name="Promo"
      style={{
        backgroundColor: "#F7F7F4",
        fontFamily,
      }}
    >
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={48} name="LogoReveal">
          <LogoReveal />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: 8 })}
        />
        <TransitionSeries.Sequence durationInFrames={102} name="Headline">
          <Headline />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: 8 })}
        />
        <TransitionSeries.Sequence durationInFrames={96} name="ProductWell">
          <ProductWell />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: 8 })}
        />
        <TransitionSeries.Sequence durationInFrames={66} name="CallToAction">
          <CallToAction />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
