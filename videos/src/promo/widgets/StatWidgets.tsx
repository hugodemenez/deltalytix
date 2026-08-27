import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { tokens } from "../tokens";
import { StatWidget } from "./StatWidget";
import { MONTHLY_PNL, TRADE_COUNT, WIN_RATE_PERCENT } from "./mock-data";

const BEZIER = Easing.bezier(0.16, 1, 0.3, 1);

export const StatWidgets: React.FC = () => {
  const frame = useCurrentFrame();
  const pnl = interpolate(frame, [4, 44], [0, MONTHLY_PNL], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: BEZIER,
  });
  const winRate = interpolate(frame, [10, 48], [0, WIN_RATE_PERCENT], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: BEZIER,
  });
  const trades = interpolate(frame, [16, 52], [0, TRADE_COUNT], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: BEZIER,
  });

  return (
    <Interactive.Div
      name="Stat widgets"
      style={{
        display: "flex",
        gap: 16,
        width: "100%",
        height: "100%",
      }}
    >
      <Interactive.Div
        name="Net P&L slot"
        style={{ flex: 1.2, minWidth: 0, height: "100%" }}
      >
        <StatWidget
          name="Net P&L card"
          label="Net P&L"
          delay={0}
          sparkline
          valueColor={tokens.positive}
        >
          {`+$${Math.round(pnl).toLocaleString("en-US")}`}
        </StatWidget>
      </Interactive.Div>
      <Interactive.Div
        name="Win rate slot"
        style={{ flex: 0.9, minWidth: 0, height: "100%" }}
      >
        <StatWidget
          name="Win rate card"
          label="Win rate"
          delay={6}
          note="Across every funded account"
        >
          {`${Math.round(winRate)}%`}
        </StatWidget>
      </Interactive.Div>
      <Interactive.Div
        name="Trades slot"
        style={{ flex: 0.9, minWidth: 0, height: "100%" }}
      >
        <StatWidget
          name="Trades card"
          label="Trades"
          delay={12}
          note="Tagged and reviewed"
        >
          {Math.round(trades)}
        </StatWidget>
      </Interactive.Div>
    </Interactive.Div>
  );
};
