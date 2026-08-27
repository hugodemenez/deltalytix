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

export const CallToAction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      name="Call to action"
      style={{
        backgroundColor: "#171917",
        fontFamily,
      }}
    >
      <Interactive.Div
        name="CTA stack"
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
          opacity: interpolate(frame, [0.05 * fps, 0.8 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          scale: interpolate(frame, [0.05 * fps, 1.1 * fps], [0.94, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 200 }),
            output: "perceptual-scale",
          }),
        }}
      >
        <LogoMark size={120} />
        <Interactive.Div
          name="CTA title"
          style={{
            color: "#FFFFFF",
            fontSize: 72,
            fontWeight: 400,
            letterSpacing: "-0.06em",
            lineHeight: 1,
          }}
        >
          Get started
        </Interactive.Div>
        <Interactive.Div
          name="CTA button"
          style={{
            marginTop: 12,
            backgroundColor: "#F3F1EA",
            color: "#171917",
            fontSize: 32,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            padding: "22px 40px",
            borderRadius: 4,
          }}
        >
          deltalytix.app
        </Interactive.Div>
        <Interactive.Div
          name="CTA footnote"
          style={{
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: 26,
            marginTop: 8,
            opacity: interpolate(frame, [1.1 * fps, 1.9 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Open source. Hosted or self-hosted.
        </Interactive.Div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
