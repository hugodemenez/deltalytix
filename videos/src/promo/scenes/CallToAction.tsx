import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { fontFamily } from "../../fonts";
import { LogoMark } from "../LogoMark";
import { FilmGrain } from "../layers/FilmGrain";
import { PaperMesh } from "../layers/PaperMesh";
import { tokens } from "../tokens";

export const CallToAction: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Call to action"
      style={{
        backgroundColor: tokens.canvas,
        fontFamily,
      }}
    >
      <PaperMesh />
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
          opacity: interpolate(frame, [0, 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(frame, [0, 10], ["0px 22px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <LogoMark size={96} color={tokens.ink} />
        <Interactive.Div
          name="CTA title"
          style={{
            color: tokens.ink,
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
            backgroundColor: tokens.action,
            color: tokens.card,
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
            color: tokens.muted,
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
      <FilmGrain />
    </AbsoluteFill>
  );
};
