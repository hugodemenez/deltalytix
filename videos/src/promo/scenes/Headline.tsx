import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { fontFamily } from "../../fonts";
import { WordReveal } from "../layers/WordReveal";
import { tokens } from "../tokens";

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
      <Interactive.Div
        name="Headline stack"
        style={{
          position: "absolute",
          left: 120,
          top: 280,
          width: 1680,
        }}
      >
        <WordReveal
          name="Line one"
          text="One trading journal"
          delay={0}
          per={3}
          fontSize={108}
          color={tokens.ink}
        />
        <Interactive.Div
          name="Line two wrap"
          style={{ marginTop: 16 }}
        >
          <WordReveal
            name="Line two"
            text="for every futures account."
            delay={10}
            per={3}
            fontSize={108}
            color={tokens.ink}
            highlight="every"
          />
        </Interactive.Div>
        <Interactive.Div
          name="Subhead"
          style={{
            marginTop: 48,
            width: 1480,
            color: tokens.muted,
            fontSize: 32,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            lineHeight: 1.35,
            opacity: interpolate(frame, [22, 32], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: BEZIER,
            }),
            translate: interpolate(frame, [22, 32], ["0px 12px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: BEZIER,
            }),
          }}
        >
          Import brokers and funded accounts, then read P&L in one place.
        </Interactive.Div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
