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
import {
  PromoThemeProvider,
  type PromoTheme,
  type PromoVariant,
  usePromoTokens,
} from "./tokens";
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

export type PromoProps = {
  readonly theme?: PromoTheme;
  readonly variant?: PromoVariant;
};

const PromoStage: React.FC<{ readonly variant: PromoVariant }> = ({
  variant,
}) => {
  const tokens = usePromoTokens();

  return (
    <AbsoluteFill
      name={variant === "landing" ? "Promo landing" : "Promo"}
      style={{
        backgroundColor: tokens.canvas,
        fontFamily,
      }}
    >
      <PromoSfx variant={variant} />
      {variant === "ads" ? (
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
      ) : (
        <TransitionSeries>
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
      )}
    </AbsoluteFill>
  );
};

export const Promo: React.FC<PromoProps> = ({
  theme = "dark",
  variant = "ads",
}) => {
  return (
    <PromoThemeProvider theme={theme}>
      <PromoStage variant={variant} />
    </PromoThemeProvider>
  );
};

export const PromoAds: React.FC = () => {
  return <Promo theme="dark" variant="ads" />;
};

export const PromoLandingLight: React.FC = () => {
  return <Promo theme="light" variant="landing" />;
};

export const PromoLandingDark: React.FC = () => {
  return <Promo theme="dark" variant="landing" />;
};
