import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { tokens } from "../tokens";
import { StatWidget } from "./StatWidget";
import { MONTHLY_PNL, TRADE_COUNT, WIN_RATE_PERCENT } from "./mock-data";

const BEZIER = Easing.bezier(0.16, 1, 0.3, 1);

type StatWidgetsProps = {
  readonly size?: "strip" | "feature";
  readonly immediate?: boolean;
};

export const StatWidgets: React.FC<StatWidgetsProps> = ({
  size = "strip",
  immediate = false,
}) => {
  const frame = useCurrentFrame();
  const feature = size === "feature";
  const countEnd = feature ? 78 : 44;
  const pnl = immediate
    ? MONTHLY_PNL
    : interpolate(frame, [4, countEnd], [0, MONTHLY_PNL], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: BEZIER,
      });
  const winRate = immediate
    ? WIN_RATE_PERCENT
    : interpolate(frame, [10, countEnd + 4], [0, WIN_RATE_PERCENT], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: BEZIER,
      });
  const trades = immediate
    ? TRADE_COUNT
    : interpolate(frame, [16, countEnd + 8], [0, TRADE_COUNT], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: BEZIER,
      });
  const enter = immediate ? -30 : 0;

  return (
    <Interactive.Div
      name="Stat widgets"
      style={{
        display: "flex",
        gap: feature ? 20 : 16,
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
          delay={enter}
          sparkline
          size={size}
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
          delay={enter + (feature ? 10 : 6)}
          size={size}
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
          delay={enter + (feature ? 20 : 12)}
          size={size}
          note="Tagged and reviewed"
        >
          {Math.round(trades)}
        </StatWidget>
      </Interactive.Div>
    </Interactive.Div>
  );
};
