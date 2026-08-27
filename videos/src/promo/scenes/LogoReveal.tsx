import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { fontFamily } from "../../fonts";
import { LogoMark } from "../LogoMark";

export const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Logo reveal"
      style={{
        backgroundColor: "#F7F7F4",
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
          scale: interpolate(frame, [0, 12], [0.86, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            output: "perceptual-scale",
          }),
        }}
      >
        <LogoMark size={148} color="#171917" />
        <Interactive.Div
          name="Wordmark"
          style={{
            color: "#171917",
            fontSize: 56,
            fontWeight: 300,
            letterSpacing: "-0.06em",
            lineHeight: 1,
            opacity: interpolate(frame, [4, 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Deltalytix
        </Interactive.Div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
