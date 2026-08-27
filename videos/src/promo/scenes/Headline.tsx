import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontFamily } from "../../fonts";

export const Headline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      name="Headline"
      style={{
        backgroundColor: "#F7F7F4",
        fontFamily,
      }}
    >
      <Interactive.Div
        name="Line one"
        style={{
          position: "absolute",
          left: 120,
          top: 268,
          width: 1680,
          color: "#171917",
          fontSize: 118,
          fontWeight: 300,
          letterSpacing: "-0.06em",
          lineHeight: 0.96,
          opacity: interpolate(frame, [0, 0.35 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(
            frame,
            [0, 0.45 * fps],
            ["0px 64px", "0px 0px"],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 14 }),
            },
          ),
        }}
      >
        One trading journal
      </Interactive.Div>
      <Interactive.Div
        name="Line two"
        style={{
          position: "absolute",
          left: 120,
          top: 392,
          width: 1680,
          color: "#171917",
          fontSize: 118,
          fontWeight: 300,
          letterSpacing: "-0.06em",
          lineHeight: 0.96,
          opacity: interpolate(frame, [0.18 * fps, 0.52 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(
            frame,
            [0.18 * fps, 0.62 * fps],
            ["0px 64px", "0px 0px"],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 14 }),
            },
          ),
        }}
      >
        for every futures account.
      </Interactive.Div>
      <Interactive.Div
        name="Subhead"
        style={{
          position: "absolute",
          left: 120,
          top: 620,
          width: 980,
          color: "#686D67",
          fontSize: 36,
          fontWeight: 400,
          letterSpacing: "-0.02em",
          lineHeight: 1.35,
          opacity: interpolate(frame, [0.7 * fps, 1.1 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Import brokers and funded accounts, then read P&L in one place.
      </Interactive.Div>
    </AbsoluteFill>
  );
};
