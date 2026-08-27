import "./index.css";
import { Composition, Folder } from "remotion";
import { Promo } from "./promo/Promo";
import { CallToAction } from "./promo/scenes/CallToAction";
import { Headline } from "./promo/scenes/Headline";
import { LogoReveal } from "./promo/scenes/LogoReveal";
import { ProductWell } from "./promo/scenes/ProductWell";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Promo-Scenes">
        <Composition
          id="LogoReveal"
          component={LogoReveal}
          durationInFrames={48}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Headline"
          component={Headline}
          durationInFrames={102}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="ProductWell"
          component={ProductWell}
          durationInFrames={96}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="CallToAction"
          component={CallToAction}
          durationInFrames={66}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
      <Composition
        id="Promo"
        component={Promo}
        durationInFrames={288}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
