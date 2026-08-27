import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill } from "remotion";
import { fontFamily } from "../fonts";
import { CallToAction } from "./scenes/CallToAction";
import { Headline } from "./scenes/Headline";
import { LogoReveal } from "./scenes/LogoReveal";
import { Metrics } from "./scenes/Metrics";

export const Promo: React.FC = () => {
  return (
    <AbsoluteFill
      name="Promo"
      style={{
        backgroundColor: "#171917",
        fontFamily,
      }}
    >
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={90} name="LogoReveal">
          <LogoReveal />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={150} name="Headline">
          <Headline />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={180} name="Metrics">
          <Metrics />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={120} name="CallToAction">
          <CallToAction />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
