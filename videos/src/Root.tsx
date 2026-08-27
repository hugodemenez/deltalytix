import "./index.css";
import { Composition, Folder } from "remotion";
import { Promo } from "./promo/Promo";
import { CallToAction } from "./promo/scenes/CallToAction";
import { Headline } from "./promo/scenes/Headline";
import { LogoReveal } from "./promo/scenes/LogoReveal";
import { ProductWell } from "./promo/scenes/ProductWell";
import {
  CTA_FRAMES,
  HEADLINE_FRAMES,
  LOGO_FRAMES,
  PRODUCT_FRAMES,
  PROMO_DURATION_FRAMES,
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
          id="ProductWell"
          component={ProductWell}
          durationInFrames={PRODUCT_FRAMES}
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
