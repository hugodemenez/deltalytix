import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { tokens } from "../tokens";
import {
  PNL_BAR_DRAW_FRAMES,
  PNL_BAR_STAGGER_FRAMES,
  PNL_DELAY_FRAMES,
} from "../timing";
import { ChartFrame } from "./ChartFrame";
import {
  CHART_HEIGHT,
  CHART_PAD,
  CHART_WIDTH,
  DailyPnlAxes,
  PNL_BAR_W,
  PNL_CHART_H,
  PNL_MAX_ABS,
  PNL_SLOT,
  PNL_ZERO_Y,
} from "./chart-geometry";
import { dailyPnlData } from "./mock-data";

type DailyPnlChartProps = {
  readonly delay?: number;
};

export const DailyPnlChart: React.FC<DailyPnlChartProps> = ({
  delay = PNL_DELAY_FRAMES,
}) => {
  const frame = useCurrentFrame();

  return (
    <ChartFrame name="Daily P&L chart" title="P&L Chart">
      <Interactive.Div
        name="Daily P&L plot"
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      >
        <Interactive.Div
          name="Daily P&L axes"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <DailyPnlAxes />
        </Interactive.Div>
        <Interactive.Div
          name="Daily P&L series"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <svg
            width={CHART_WIDTH}
            height={CHART_HEIGHT}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: "100%", height: "100%", display: "block" }}
          >
            {dailyPnlData.map((point, index) => {
              const grow = interpolate(
                frame,
                [
                  delay + index * PNL_BAR_STAGGER_FRAMES,
                  delay +
                    index * PNL_BAR_STAGGER_FRAMES +
                    PNL_BAR_DRAW_FRAMES,
                ],
                [0, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.22, 1, 0.36, 1),
                },
              );
              const x = Math.round(
                CHART_PAD.left + PNL_SLOT * index + (PNL_SLOT - PNL_BAR_W) / 2,
              );
              const barH = Math.round(
                (Math.abs(point.value) / PNL_MAX_ABS) * (PNL_CHART_H / 2 - 8) * grow,
              );
              const y = point.value >= 0 ? PNL_ZERO_Y - barH : PNL_ZERO_Y;
              return (
                <rect
                  key={point.label}
                  x={x}
                  y={y}
                  width={PNL_BAR_W}
                  height={Math.max(barH, 0)}
                  rx={3}
                  fill={point.value >= 0 ? tokens.chartWin : tokens.chartLoss}
                />
              );
            })}
          </svg>
        </Interactive.Div>
      </Interactive.Div>
    </ChartFrame>
  );
};
