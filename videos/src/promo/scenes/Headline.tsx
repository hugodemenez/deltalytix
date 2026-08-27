import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { fontFamily } from "../../fonts";

export const Headline: React.FC = () => {
  const frame = useCurrentFrame();

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
          opacity: interpolate(frame, [0, 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(frame, [0, 10], ["0px 36px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
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
          opacity: interpolate(frame, [4, 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(frame, [4, 14], ["0px 36px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
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
          opacity: interpolate(frame, [12, 22], [0, 1], {
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
