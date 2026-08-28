import { Img, Interactive, staticFile } from "remotion";
import { usePromoTokens } from "../tokens";
import { FtmoMark } from "./Icons";

type WhiteLogoProps = {
  readonly slug: string;
  readonly ext?: "png" | "svg";
  readonly size: number;
  readonly name: string;
};

export const WhiteLogo: React.FC<WhiteLogoProps> = ({
  slug,
  ext = "png",
  size,
  name,
}) => {
  const tokens = usePromoTokens();

  if (slug === "ftmo") {
    return <FtmoMark name={name} size={size} color={tokens.ink} />;
  }

  return (
    <Interactive.Div
      name={name}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <Img
        src={staticFile(`logos/monochrome/${slug}-${tokens.logoTone}.${ext}`)}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          display: "block",
        }}
      />
    </Interactive.Div>
  );
};
