import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontFamily } from "../../fonts";
import { LogoMark } from "../LogoMark";

export const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
          scale: interpolate(frame, [0, 0.7 * fps], [0.72, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 14 }),
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
            opacity: interpolate(frame, [0.18 * fps, 0.55 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(
              frame,
              [0.18 * fps, 0.55 * fps],
              ["0px 24px", "0px 0px"],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.spring({ damping: 16 }),
              },
            ),
          }}
        >
          Deltalytix
        </Interactive.Div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
