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
  const { fps, durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill
      name="Logo reveal"
      style={{
        backgroundColor: "#171917",
        fontFamily,
      }}
    >
      <Interactive.Div
        name="Background glow"
        style={{
          position: "absolute",
          left: 360,
          top: 140,
          width: 1200,
          height: 800,
          background:
            "radial-gradient(ellipse at center, rgba(42, 155, 143, 0.16) 0%, rgba(23, 25, 23, 0) 68%)",
          opacity: interpolate(frame, [0, 1.2 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      />
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
          gap: 28,
          opacity: interpolate(
            frame,
            [0.1 * fps, 1.1 * fps, durationInFrames - 28, durationInFrames - 12],
            [0, 1, 1, 0],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: [
                Easing.bezier(0.16, 1, 0.3, 1),
                Easing.linear,
                Easing.bezier(0.16, 1, 0.3, 1),
              ],
            },
          ),
          scale: interpolate(frame, [0.1 * fps, 1.4 * fps], [0.84, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 200 }),
            output: "perceptual-scale",
          }),
        }}
      >
        <LogoMark />
        <Interactive.Div
          name="Wordmark"
          style={{
            color: "#FFFFFF",
            fontSize: 64,
            fontWeight: 400,
            letterSpacing: "-0.06em",
            lineHeight: 1,
            opacity: interpolate(frame, [0.6 * fps, 1.5 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Deltalytix
        </Interactive.Div>
        <Interactive.Div
          name="Eyebrow"
          style={{
            color: "rgba(255, 255, 255, 0.55)",
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: interpolate(frame, [1.1 * fps, 2 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Trading journal
        </Interactive.Div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
