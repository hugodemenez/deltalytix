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

export const Metrics: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const pnl = interpolate(frame, [0.5 * fps, 2.1 * fps], [0, 12480], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const winRate = interpolate(frame, [0.7 * fps, 2.2 * fps], [0, 64], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const timeInTrade = interpolate(frame, [0.9 * fps, 2.3 * fps], [0, 4.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill
      name="Metrics"
      style={{
        backgroundColor: "#171917",
        fontFamily,
      }}
    >
      <Interactive.Div
        name="Metrics content"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          opacity: interpolate(
            frame,
            [0, 1, durationInFrames - 28, durationInFrames - 12],
            [1, 1, 1, 0],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: [
                Easing.linear,
                Easing.linear,
                Easing.bezier(0.16, 1, 0.3, 1),
              ],
            },
          ),
        }}
      >
      <Interactive.Div
        name="Section label"
        style={{
          position: "absolute",
          left: 160,
          top: 148,
          color: "rgba(255, 255, 255, 0.5)",
          fontSize: 24,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          opacity: interpolate(frame, [0, 0.6 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        See what happened
      </Interactive.Div>
      <Interactive.Div
        name="Section title"
        style={{
          position: "absolute",
          left: 160,
          top: 196,
          color: "#FFFFFF",
          fontSize: 56,
          fontWeight: 400,
          letterSpacing: "-0.05em",
          opacity: interpolate(frame, [0.1 * fps, 0.8 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Performance, in one dashboard.
      </Interactive.Div>
      <Interactive.Div
        name="P&L card"
        style={{
          position: "absolute",
          left: 160,
          top: 340,
          width: 500,
          height: 280,
          backgroundColor: "#202220",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 8,
          padding: 36,
          opacity: interpolate(frame, [0.25 * fps, 1 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(
            frame,
            [0.25 * fps, 1.1 * fps],
            ["0px 32px", "0px 0px"],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 200 }),
            },
          ),
        }}
      >
        <Interactive.Div
          name="P&L label"
          style={{
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: 22,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Net P&L
        </Interactive.Div>
        <Interactive.Div
          name="P&L value"
          style={{
            color: "#2A9B8F",
            fontSize: 72,
            fontWeight: 500,
            letterSpacing: "-0.05em",
            marginTop: 18,
          }}
        >
          {formatPnl(pnl)}
        </Interactive.Div>
        <Interactive.Svg
          name="Equity sparkline"
          viewBox="0 0 420 72"
          style={{
            width: 420,
            height: 72,
            marginTop: 28,
            display: "block",
          }}
        >
          <Interactive.Path
            name="Equity path"
            d="M4 58 C 40 58, 58 50, 88 42 S 140 18, 188 28 S 250 8, 310 16 S 370 6, 416 8"
            fill="none"
            stroke="#2A9B8F"
            strokeWidth={3}
            strokeLinecap="round"
            style={{
              strokeDasharray: 800,
              strokeDashoffset: interpolate(
                frame,
                [0.8 * fps, 2.6 * fps],
                [800, 0],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                },
              ),
            }}
          />
        </Interactive.Svg>
      </Interactive.Div>
      <Interactive.Div
        name="Win rate card"
        style={{
          position: "absolute",
          left: 710,
          top: 340,
          width: 500,
          height: 280,
          backgroundColor: "#202220",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 8,
          padding: 36,
          opacity: interpolate(frame, [0.45 * fps, 1.2 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(
            frame,
            [0.45 * fps, 1.3 * fps],
            ["0px 32px", "0px 0px"],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 200 }),
            },
          ),
        }}
      >
        <Interactive.Div
          name="Win rate label"
          style={{
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: 22,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Win rate
        </Interactive.Div>
        <Interactive.Div
          name="Win rate value"
          style={{
            color: "#FFFFFF",
            fontSize: 72,
            fontWeight: 500,
            letterSpacing: "-0.05em",
            marginTop: 18,
          }}
        >
          {`${Math.round(winRate)}%`}
        </Interactive.Div>
        <Interactive.Div
          name="Win rate note"
          style={{
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: 24,
            marginTop: 28,
          }}
        >
          Across every funded account
        </Interactive.Div>
      </Interactive.Div>
      <Interactive.Div
        name="Time card"
        style={{
          position: "absolute",
          left: 1260,
          top: 340,
          width: 500,
          height: 280,
          backgroundColor: "#202220",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 8,
          padding: 36,
          opacity: interpolate(frame, [0.65 * fps, 1.4 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(
            frame,
            [0.65 * fps, 1.5 * fps],
            ["0px 32px", "0px 0px"],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 200 }),
            },
          ),
        }}
      >
        <Interactive.Div
          name="Time label"
          style={{
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: 22,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Avg time in trade
        </Interactive.Div>
        <Interactive.Div
          name="Time value"
          style={{
            color: "#FFFFFF",
            fontSize: 72,
            fontWeight: 500,
            letterSpacing: "-0.05em",
            marginTop: 18,
          }}
        >
          {`${timeInTrade.toFixed(1)}m`}
        </Interactive.Div>
        <Interactive.Div
          name="Time note"
          style={{
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: 24,
            marginTop: 28,
          }}
        >
          Filter by weekday and instrument
        </Interactive.Div>
      </Interactive.Div>
      <Interactive.Div
        name="Feature row"
        style={{
          position: "absolute",
          left: 160,
          top: 700,
          display: "flex",
          gap: 18,
          opacity: interpolate(frame, [1.6 * fps, 2.4 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <Interactive.Div
          name="Import pill"
          style={{
            color: "#171917",
            backgroundColor: "#F3F1EA",
            fontSize: 26,
            padding: "14px 22px",
            borderRadius: 4,
          }}
        >
          Import
        </Interactive.Div>
        <Interactive.Div
          name="Analyze pill"
          style={{
            color: "#FFFFFF",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            fontSize: 26,
            padding: "14px 22px",
            borderRadius: 4,
          }}
        >
          Analyze
        </Interactive.Div>
        <Interactive.Div
          name="Journal pill"
          style={{
            color: "#FFFFFF",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            fontSize: 26,
            padding: "14px 22px",
            borderRadius: 4,
          }}
        >
          Journal
        </Interactive.Div>
        <Interactive.Div
          name="Coach pill"
          style={{
            color: "#FFFFFF",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            fontSize: 26,
            padding: "14px 22px",
            borderRadius: 4,
          }}
        >
          AI coach
        </Interactive.Div>
      </Interactive.Div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
