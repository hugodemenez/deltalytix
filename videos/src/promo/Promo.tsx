import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { AbsoluteFill } from "remotion";
import { fontFamily } from "../fonts";
import { PromoSfx } from "./PromoSfx";
import { CalendarFeature } from "./scenes/CalendarFeature";
import { CallToAction } from "./scenes/CallToAction";
import { EquityFeature } from "./scenes/EquityFeature";
import { Headline } from "./scenes/Headline";
import { LogoReveal } from "./scenes/LogoReveal";
import { PnlFeature } from "./scenes/PnlFeature";
import { ProductWell } from "./scenes/ProductWell";
import { StatsFeature } from "./scenes/StatsFeature";
import {
  CALENDAR_FRAMES,
  CTA_FRAMES,
  EQUITY_FRAMES,
  HEADLINE_FRAMES,
  LOGO_FRAMES,
  PNL_FRAMES,
  SLIDE_FRAMES,
  STATS_FRAMES,
  TOGETHER_FRAMES,
} from "./timing";

const slideUp = {
  presentation: slide({ direction: "from-bottom" as const }),
  timing: linearTiming({ durationInFrames: SLIDE_FRAMES }),
};

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
        <TransitionSeries.Transition {...slideUp} />
        <TransitionSeries.Sequence durationInFrames={HEADLINE_FRAMES} name="Headline">
          <Headline />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...slideUp} />
        <TransitionSeries.Sequence durationInFrames={STATS_FRAMES} name="StatsFeature">
          <StatsFeature />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...slideUp} />
        <TransitionSeries.Sequence durationInFrames={CALENDAR_FRAMES} name="CalendarFeature">
          <CalendarFeature />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...slideUp} />
        <TransitionSeries.Sequence durationInFrames={EQUITY_FRAMES} name="EquityFeature">
          <EquityFeature />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...slideUp} />
        <TransitionSeries.Sequence durationInFrames={PNL_FRAMES} name="PnlFeature">
          <PnlFeature />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...slideUp} />
        <TransitionSeries.Sequence durationInFrames={TOGETHER_FRAMES} name="ProductWell">
          <ProductWell />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...slideUp} />
        <TransitionSeries.Sequence durationInFrames={CTA_FRAMES} name="CallToAction">
          <CallToAction />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
