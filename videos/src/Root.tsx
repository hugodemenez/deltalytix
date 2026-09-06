import "./index.css";
import { Composition, Folder } from "remotion";
import { PromoAds, PromoLandingDark, PromoLandingLight } from "./promo/Promo";
import { CalendarFeature } from "./promo/scenes/CalendarFeature";
import { CallToAction } from "./promo/scenes/CallToAction";
import { ChatFeature } from "./promo/scenes/ChatFeature";
import { ConnectionsFeature } from "./promo/scenes/ConnectionsFeature";
import { DashboardScroll } from "./promo/scenes/DashboardScroll";
import { EquityFeature } from "./promo/scenes/EquityFeature";
import { Headline } from "./promo/scenes/Headline";
import { LogoReveal } from "./promo/scenes/LogoReveal";
import { PnlFeature } from "./promo/scenes/PnlFeature";
import { ProductWell } from "./promo/scenes/ProductWell";
import { PropFirmFeature } from "./promo/scenes/PropFirmFeature";
import { StatsFeature } from "./promo/scenes/StatsFeature";
import {
  CALENDAR_FRAMES,
  CHAT_FRAMES,
  CONNECTIONS_FRAMES,
  CTA_FRAMES,
  DASHBOARD_FRAMES,
  DASH_OVERVIEW_HOLD,
  EQUITY_FRAMES,
  HEADLINE_FRAMES,
  LANDING_DURATION_FRAMES,
  LOGO_FRAMES,
  PNL_FRAMES,
  PROP_FRAMES,
  PROMO_DURATION_FRAMES,
  STATS_FRAMES,
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
          id="ChatFeature"
          component={ChatFeature}
          durationInFrames={CHAT_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="PropFirmFeature"
          component={PropFirmFeature}
          durationInFrames={PROP_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="ConnectionsFeature"
          component={ConnectionsFeature}
          durationInFrames={CONNECTIONS_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="ProductWell"
          component={ProductWell}
          durationInFrames={DASH_OVERVIEW_HOLD}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="DashboardScroll"
          component={DashboardScroll}
          durationInFrames={DASHBOARD_FRAMES}
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
        component={PromoAds}
        durationInFrames={PROMO_DURATION_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="PromoLandingLight"
        component={PromoLandingLight}
        durationInFrames={LANDING_DURATION_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="PromoLandingDark"
        component={PromoLandingDark}
        durationInFrames={LANDING_DURATION_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
