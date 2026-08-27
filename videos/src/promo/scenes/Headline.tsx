import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { fontFamily } from "../../fonts";
import { FilmGrain } from "../layers/FilmGrain";
import { PaperMesh } from "../layers/PaperMesh";
import { WordReveal } from "../layers/WordReveal";
import { tokens } from "../tokens";
import { HEADLINE_FRAMES } from "../timing";

const BEZIER = Easing.bezier(0.16, 1, 0.3, 1);

export const Headline: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Headline"
      style={{
        backgroundColor: tokens.canvas,
        fontFamily,
      }}
    >
      <PaperMesh />
      <Interactive.Div
        name="Headline stack"
        style={{
          position: "absolute",
          left: 120,
          top: 248,
          width: 1680,
          transformOrigin: "left top",
          scale: interpolate(frame, [0, HEADLINE_FRAMES], [1, 1.035], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.45, 0, 0.55, 1),
            output: "perceptual-scale",
          }),
        }}
      >
        <WordReveal
          name="Line one"
          text="One trading journal"
          delay={0}
          per={4}
          fontSize={118}
          color={tokens.ink}
        />
        <Interactive.Div
          name="Line two wrap"
          style={{ marginTop: 18 }}
        >
          <WordReveal
            name="Line two"
            text="for every futures account."
            delay={12}
            per={4}
            fontSize={118}
            color={tokens.ink}
            highlight="every"
          />
        </Interactive.Div>
        <Interactive.Div
          name="Subhead"
          style={{
            marginTop: 64,
            width: 1480,
            color: tokens.muted,
            fontSize: 36,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            lineHeight: 1.35,
            opacity: interpolate(frame, [28, 40], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: BEZIER,
            }),
            translate: interpolate(frame, [28, 40], ["0px 18px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: BEZIER,
            }),
          }}
        >
          Import brokers and funded accounts, then read P&L in one place.
        </Interactive.Div>
      </Interactive.Div>
      <FilmGrain />
    </AbsoluteFill>
  );
};
