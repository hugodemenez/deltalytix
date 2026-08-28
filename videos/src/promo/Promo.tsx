import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill } from "remotion";
import { fontFamily } from "../fonts";
import { PromoSfx } from "./PromoSfx";
import { CalendarFeature } from "./scenes/CalendarFeature";
import { CallToAction } from "./scenes/CallToAction";
import { ChatFeature } from "./scenes/ChatFeature";
import { ConnectionsFeature } from "./scenes/ConnectionsFeature";
import { EquityFeature } from "./scenes/EquityFeature";
import { Headline } from "./scenes/Headline";
import { LogoReveal } from "./scenes/LogoReveal";
import { PnlFeature } from "./scenes/PnlFeature";
import { ProductWell } from "./scenes/ProductWell";
import { PropFirmFeature } from "./scenes/PropFirmFeature";
import { StatsFeature } from "./scenes/StatsFeature";
import { tokens } from "./tokens";
import {
  CALENDAR_FRAMES,
  CHAT_FRAMES,
  CONNECTIONS_FRAMES,
  CTA_FRAMES,
  CUT_FRAMES,
  EQUITY_FRAMES,
  HEADLINE_FRAMES,
  LOGO_FRAMES,
  PNL_FRAMES,
  PROP_FRAMES,
  STATS_FRAMES,
  TOGETHER_FRAMES,
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
        <TransitionSeries.Sequence durationInFrames={CALENDAR_FRAMES} name="CalendarFeature">
          <CalendarFeature />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeCut} />
        <TransitionSeries.Sequence durationInFrames={EQUITY_FRAMES} name="EquityFeature">
          <EquityFeature />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeCut} />
        <TransitionSeries.Sequence durationInFrames={PNL_FRAMES} name="PnlFeature">
          <PnlFeature />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeCut} />
        <TransitionSeries.Sequence durationInFrames={CHAT_FRAMES} name="ChatFeature">
          <ChatFeature />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeCut} />
        <TransitionSeries.Sequence durationInFrames={PROP_FRAMES} name="PropFirmFeature">
          <PropFirmFeature />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeCut} />
        <TransitionSeries.Sequence durationInFrames={CONNECTIONS_FRAMES} name="ConnectionsFeature">
          <ConnectionsFeature />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeCut} />
        <TransitionSeries.Sequence durationInFrames={TOGETHER_FRAMES} name="ProductWell">
          <ProductWell />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeCut} />
        <TransitionSeries.Sequence durationInFrames={CTA_FRAMES} name="CallToAction">
          <CallToAction />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
