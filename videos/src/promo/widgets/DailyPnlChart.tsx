import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { tokens } from "../tokens";
import { ChartFrame } from "./ChartFrame";
import { dailyPnlData, formatUsd } from "./mock-data";

const WIDTH = 680;
const HEIGHT = 360;
const PAD = { top: 16, right: 12, bottom: 32, left: 58 };

type DailyPnlChartProps = {
  readonly delay?: number;
};

export const DailyPnlChart: React.FC<DailyPnlChartProps> = ({ delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const maxAbs = Math.max(...dailyPnlData.map((point) => Math.abs(point.value)));
  const chartW = WIDTH - PAD.left - PAD.right;
  const chartH = HEIGHT - PAD.top - PAD.bottom;
  const zeroY = PAD.top + chartH / 2;
  const slot = chartW / dailyPnlData.length;
  const barW = Math.min(34, slot * 0.55);

  return (
    <ChartFrame name="Daily P&L chart" title="P&L Chart">
      <Interactive.Div
        name="Daily P&L plot"
        style={{
          width: "100%",
          height: "100%",
          opacity: interpolate(frame, [delay, delay + 0.28 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <Interactive.Svg
          name="Daily P&L svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={zeroY}
            y2={zeroY}
            stroke={tokens.border}
          />
          <text
            x={PAD.left - 10}
            y={PAD.top + 4}
            textAnchor="end"
            fill={tokens.muted}
            fontSize={12}
          >
            {formatUsd(maxAbs)}
          </text>
          <text
            x={PAD.left - 10}
            y={PAD.top + chartH}
            textAnchor="end"
            fill={tokens.muted}
            fontSize={12}
          >
            {formatUsd(-maxAbs)}
          </text>
          {dailyPnlData.map((point, index) => {
            const grow = interpolate(
              frame,
              [delay + index, delay + 0.35 * fps + index],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              },
            );
            const x = PAD.left + slot * index + (slot - barW) / 2;
            const barH = (Math.abs(point.value) / maxAbs) * (chartH / 2 - 8) * grow;
            const y = point.value >= 0 ? zeroY - barH : zeroY;
            return (
              <g key={point.label}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(barH, 0)}
                  rx={3}
                  fill={point.value >= 0 ? tokens.chartWin : tokens.chartLoss}
                />
                <text
                  x={x + barW / 2}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  fill={tokens.muted}
                  fontSize={12}
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </Interactive.Svg>
      </Interactive.Div>
    </ChartFrame>
  );
};
