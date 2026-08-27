import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { fontFamily } from "../../fonts";
import { LogoMark } from "../LogoMark";

export const CallToAction: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Call to action"
      style={{
        backgroundColor: "#F7F7F4",
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
          scale: interpolate(frame, [0, 10], [0.94, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            output: "perceptual-scale",
          }),
        }}
      >
        <LogoMark size={96} color="#171917" />
        <Interactive.Div
          name="CTA title"
          style={{
            color: "#171917",
            fontSize: 88,
            fontWeight: 300,
            letterSpacing: "-0.06em",
            lineHeight: 1,
          }}
        >
          Get Started
        </Interactive.Div>
        <Interactive.Div
          name="CTA button"
          style={{
            marginTop: 8,
            backgroundColor: "#181A18",
            color: "#FFFFFF",
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            padding: "20px 36px",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          deltalytix.app
          <Interactive.Span name="CTA arrow">→</Interactive.Span>
        </Interactive.Div>
        <Interactive.Div
          name="CTA footnote"
          style={{
            color: "#686D67",
            fontSize: 24,
            fontWeight: 400,
            opacity: interpolate(frame, [8, 18], [0, 1], {
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
