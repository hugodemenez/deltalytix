import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { fontFamily } from "../../fonts";
import { LogoMark } from "../LogoMark";
import { tokens } from "../tokens";

const BEZIER = Easing.bezier(0.16, 1, 0.3, 1);

export const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Logo reveal"
      style={{
        backgroundColor: tokens.canvas,
        fontFamily,
      }}
    >
      <Interactive.Div
        name="Logo stack"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          opacity: interpolate(frame, [0, 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: BEZIER,
          }),
          translate: interpolate(frame, [0, 12], ["0px 20px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: BEZIER,
          }),
        }}
      >
        <LogoMark size={132} color={tokens.ink} />
        <Interactive.Div
          name="Wordmark"
          style={{
            color: tokens.ink,
            fontSize: 52,
            fontWeight: 300,
            letterSpacing: "-0.06em",
            lineHeight: 1,
            opacity: interpolate(frame, [6, 16], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: BEZIER,
            }),
            translate: interpolate(frame, [6, 16], ["0px 12px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: BEZIER,
            }),
          }}
        >
          Deltalytix
        </Interactive.Div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
