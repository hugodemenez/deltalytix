import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill } from "remotion";
import { fontFamily } from "../fonts";
import { PromoSfx } from "./PromoSfx";
import { CallToAction } from "./scenes/CallToAction";
import { DashboardScroll } from "./scenes/DashboardScroll";
import { Headline } from "./scenes/Headline";
import { LogoReveal } from "./scenes/LogoReveal";
import { StatsFeature } from "./scenes/StatsFeature";
import { tokens } from "./tokens";
import {
  CTA_FRAMES,
  CUT_FRAMES,
  DASHBOARD_FRAMES,
  HEADLINE_FRAMES,
  LOGO_FRAMES,
  STATS_FRAMES,
} from "./timing";

const fadeCut = {
  presentation: fade(),
  timing: linearTiming({ durationInFrames: CUT_FRAMES }),
};

export const Promo: React.FC = () => {
  return (
    <AbsoluteFill
      name="Promo"
      style={{
        backgroundColor: tokens.canvas,
        fontFamily,
      }}
    >
      <PromoSfx />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={LOGO_FRAMES} name="LogoReveal">
          <LogoReveal />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeCut} />
        <TransitionSeries.Sequence durationInFrames={HEADLINE_FRAMES} name="Headline">
          <Headline />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeCut} />
        <TransitionSeries.Sequence durationInFrames={STATS_FRAMES} name="StatsFeature">
          <StatsFeature />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeCut} />
        <TransitionSeries.Sequence durationInFrames={DASHBOARD_FRAMES} name="DashboardScroll">
          <DashboardScroll />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeCut} />
        <TransitionSeries.Sequence durationInFrames={CTA_FRAMES} name="CallToAction">
          <CallToAction />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
