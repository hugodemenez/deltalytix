import "./index.css";
import { Composition, Folder } from "remotion";
import { Promo } from "./promo/Promo";
import { CallToAction } from "./promo/scenes/CallToAction";
import { Headline } from "./promo/scenes/Headline";
import { LogoReveal } from "./promo/scenes/LogoReveal";
import { Metrics } from "./promo/scenes/Metrics";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Promo-Scenes">
        <Composition
          id="LogoReveal"
          component={LogoReveal}
          durationInFrames={90}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Headline"
          component={Headline}
          durationInFrames={150}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Metrics"
          component={Metrics}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="CallToAction"
          component={CallToAction}
          durationInFrames={120}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
      <Composition
        id="Promo"
        component={Promo}
        durationInFrames={504}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
