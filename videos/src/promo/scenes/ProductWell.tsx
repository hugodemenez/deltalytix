import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontFamily } from "../../fonts";

const formatPnl = (value: number) => {
  return `+$${Math.round(value).toLocaleString("en-US")}`;
};

export const ProductWell: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pnl = interpolate(frame, [0.35 * fps, 1.05 * fps], [0, 12480], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const winRate = interpolate(frame, [0.5 * fps, 1.15 * fps], [0, 64], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill
      name="Product well"
      style={{
        backgroundColor: "oklch(0.88 0.04 165)",
        fontFamily,
        padding: 48,
      }}
    >
      <Interactive.Div
        name="Product surface"
        style={{
          position: "absolute",
          left: 48,
          top: 48,
          width: 1824,
          height: 984,
          backgroundColor: "#FFFFFF",
          borderRadius: 4,
          boxShadow: "0 25px 50px -12px oklch(0 0 0 / 0.15)",
          outline: "1px solid oklch(0 0 0 / 0.1)",
          scale: interpolate(frame, [0, 0.5 * fps], [0.94, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 16 }),
            output: "perceptual-scale",
          }),
        }}
      >
        <Interactive.Div
          name="Well eyebrow"
          style={{
            position: "absolute",
            left: 72,
            top: 72,
            color: "#3E7550",
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: "0.04em",
            opacity: interpolate(frame, [0.12 * fps, 0.4 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          See what happened
        </Interactive.Div>
        <Interactive.Div
          name="P&L value"
          style={{
            position: "absolute",
            left: 72,
            top: 280,
            color: "#3E7550",
            fontSize: 120,
            fontWeight: 300,
            letterSpacing: "-0.06em",
            lineHeight: 1,
            opacity: interpolate(frame, [0.2 * fps, 0.5 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(
              frame,
              [0.2 * fps, 0.55 * fps],
              ["0px 48px", "0px 0px"],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.spring({ damping: 14 }),
              },
            ),
          }}
        >
          {formatPnl(pnl)}
        </Interactive.Div>
        <Interactive.Div
          name="P&L label"
          style={{
            position: "absolute",
            left: 72,
            top: 420,
            color: "#686D67",
            fontSize: 28,
            fontWeight: 400,
            opacity: interpolate(frame, [0.35 * fps, 0.65 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Net P&L
        </Interactive.Div>
        <Interactive.Div
          name="Win rate value"
          style={{
            position: "absolute",
            left: 760,
            top: 280,
            color: "#171917",
            fontSize: 120,
            fontWeight: 300,
            letterSpacing: "-0.06em",
            lineHeight: 1,
            opacity: interpolate(frame, [0.38 * fps, 0.68 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(
              frame,
              [0.38 * fps, 0.72 * fps],
              ["0px 48px", "0px 0px"],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.spring({ damping: 14 }),
              },
            ),
          }}
        >
          {`${Math.round(winRate)}%`}
        </Interactive.Div>
        <Interactive.Div
          name="Win rate label"
          style={{
            position: "absolute",
            left: 760,
            top: 420,
            color: "#686D67",
            fontSize: 28,
            fontWeight: 400,
            opacity: interpolate(frame, [0.5 * fps, 0.8 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Win rate
        </Interactive.Div>
        <Interactive.Div
          name="Place value"
          style={{
            position: "absolute",
            left: 1220,
            top: 280,
            color: "#171917",
            fontSize: 72,
            fontWeight: 300,
            letterSpacing: "-0.06em",
            lineHeight: 1.05,
            width: 520,
            opacity: interpolate(frame, [0.55 * fps, 0.85 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(
              frame,
              [0.55 * fps, 0.9 * fps],
              ["0px 48px", "0px 0px"],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.spring({ damping: 14 }),
              },
            ),
          }}
        >
          One dashboard.
        </Interactive.Div>
        <Interactive.Div
          name="Place label"
          style={{
            position: "absolute",
            left: 1220,
            top: 460,
            color: "#686D67",
            fontSize: 28,
            fontWeight: 400,
            opacity: interpolate(frame, [0.7 * fps, 1 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Every funded account
        </Interactive.Div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
