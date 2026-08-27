import "./index.css";
import { Composition, Folder } from "remotion";
import { Promo } from "./promo/Promo";
import { CalendarFeature } from "./promo/scenes/CalendarFeature";
import { CallToAction } from "./promo/scenes/CallToAction";
import { EquityFeature } from "./promo/scenes/EquityFeature";
import { Headline } from "./promo/scenes/Headline";
import { LogoReveal } from "./promo/scenes/LogoReveal";
import { PnlFeature } from "./promo/scenes/PnlFeature";
import { ProductWell } from "./promo/scenes/ProductWell";
import { StatsFeature } from "./promo/scenes/StatsFeature";
import {
  CALENDAR_FRAMES,
  CTA_FRAMES,
  EQUITY_FRAMES,
  HEADLINE_FRAMES,
  LOGO_FRAMES,
  PNL_FRAMES,
  PROMO_DURATION_FRAMES,
  STATS_FRAMES,
  TOGETHER_FRAMES,
} from "./promo/timing";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Promo-Scenes">
        <Composition
          id="LogoReveal"
          component={LogoReveal}
          durationInFrames={LOGO_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Headline"
          component={Headline}
          durationInFrames={HEADLINE_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="StatsFeature"
          component={StatsFeature}
          durationInFrames={STATS_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="CalendarFeature"
          component={CalendarFeature}
          durationInFrames={CALENDAR_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="EquityFeature"
          component={EquityFeature}
          durationInFrames={EQUITY_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="PnlFeature"
          component={PnlFeature}
          durationInFrames={PNL_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="ProductWell"
          component={ProductWell}
          durationInFrames={TOGETHER_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="CallToAction"
          component={CallToAction}
          durationInFrames={CTA_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
      <Composition
        id="Promo"
        component={Promo}
        durationInFrames={PROMO_DURATION_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
