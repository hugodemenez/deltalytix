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
        backgroundColor: "#171917",
        fontFamily,
      }}
    >
      <Interactive.Div
        name="Accent bar"
        style={{
          position: "absolute",
          left: 160,
          top: 268,
          height: 4,
          width: interpolate(frame, [0.15 * fps, 1.1 * fps], [0, 120], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          backgroundColor: "#2A9B8F",
        }}
      />
      <Interactive.Div
        name="Headline copy"
        style={{
          position: "absolute",
          left: 160,
          top: 300,
          width: 1600,
          color: "#FFFFFF",
          fontSize: 108,
          fontWeight: 400,
          letterSpacing: "-0.06em",
          lineHeight: 1.02,
          opacity: interpolate(frame, [0.1 * fps, 0.9 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(
            frame,
            [0.1 * fps, 0.9 * fps],
            ["0px 28px", "0px 0px"],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 200 }),
            },
          ),
        }}
      >
        One trading journal
        <br />
        for every futures account.
      </Interactive.Div>
      <Interactive.Div
        name="Subhead"
        style={{
          position: "absolute",
          left: 160,
          top: 760,
          width: 1100,
          color: "rgba(255, 255, 255, 0.58)",
          fontSize: 40,
          fontWeight: 400,
          letterSpacing: "-0.02em",
          lineHeight: 1.35,
          opacity: interpolate(frame, [0.8 * fps, 1.7 * fps], [0, 1], {
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
