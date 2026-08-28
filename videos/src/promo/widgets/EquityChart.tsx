import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { tokens } from "../tokens";
import {
  EQUITY_DELAY_FRAMES,
  EQUITY_DRAW_FRAMES,
} from "../timing";
import { ChartFrame } from "./ChartFrame";
import {
  CHART_HEIGHT,
  CHART_WIDTH,
  EquityAxes,
  equityArea,
  equityLine,
} from "./chart-geometry";

type EquityChartProps = {
  readonly delay?: number;
  readonly drawFrames?: number;
  readonly framed?: boolean;
};

export const EquityChart: React.FC<EquityChartProps> = ({
  delay = EQUITY_DELAY_FRAMES,
  drawFrames = EQUITY_DRAW_FRAMES,
  framed = true,
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(
    frame,
    [delay, delay + drawFrames],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    },
  );
  const hiddenRight = Math.round((1 - progress) * 10000) / 100;

  return (
    <ChartFrame name="Equity chart" title="Equity Chart" framed={framed}>
      <Interactive.Div
        name="Equity plot"
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      >
        <Interactive.Div
          name="Equity axes"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <EquityAxes />
        </Interactive.Div>
        <Interactive.Div
          name="Equity series clip"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            clipPath: `inset(0 ${hiddenRight}% 0 0)`,
          }}
        >
          <svg
            width={CHART_WIDTH}
            height={CHART_HEIGHT}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: "100%", height: "100%", display: "block" }}
          >
            <defs>
              <linearGradient id="promo-equity-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={tokens.chartWin} stopOpacity="0.28" />
                <stop
                  offset="100%"
                  stopColor={tokens.chartWin}
                  stopOpacity="0.02"
                />
              </linearGradient>
            </defs>
            <path d={equityArea} fill="url(#promo-equity-fill)" />
            <path
              d={equityLine}
              fill="none"
              stroke={tokens.chartWin}
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </Interactive.Div>
      </Interactive.Div>
    </ChartFrame>
  );
};
