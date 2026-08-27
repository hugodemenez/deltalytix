import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { tokens } from "../tokens";
import { ChartFrame } from "./ChartFrame";
import { equityData } from "./mock-data";

const WIDTH = 680;
const HEIGHT = 360;
const PAD = { top: 12, right: 12, bottom: 32, left: 58 };

type EquityChartProps = {
  readonly delay?: number;
};

export const EquityChart: React.FC<EquityChartProps> = ({ delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const values = equityData.map((point) => point.value);
  const min = Math.min(...values) - 120;
  const max = Math.max(...values) + 120;
  const chartW = WIDTH - PAD.left - PAD.right;
  const chartH = HEIGHT - PAD.top - PAD.bottom;
  const points = equityData.map((point, index) => {
    const x = PAD.left + (index / (equityData.length - 1)) * chartW;
    const y = PAD.top + (1 - (point.value - min) / (max - min)) * chartH;
    return { x, y, label: point.label };
  });
  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const area = `${line} L ${points[points.length - 1].x} ${PAD.top + chartH} L ${points[0].x} ${PAD.top + chartH} Z`;
  const progress = interpolate(frame, [delay, delay + 0.45 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const yTicks = [min, (min + max) / 2, max];

  return (
    <ChartFrame name="Equity chart" title="Equity Chart">
      <Interactive.Div
        name="Equity plot"
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
          name="Equity svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <defs>
            <linearGradient id="promo-equity-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tokens.chartWin} stopOpacity="0.35" />
              <stop offset="100%" stopColor={tokens.chartWin} stopOpacity="0.02" />
            </linearGradient>
            <clipPath id="promo-equity-reveal">
              <rect
                x={PAD.left}
                y={0}
                width={chartW * progress}
                height={HEIGHT}
              />
            </clipPath>
          </defs>
          {yTicks.map((tick) => {
            const y = PAD.top + (1 - (tick - min) / (max - min)) * chartH;
            return (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={y}
                  y2={y}
                  stroke={tokens.border}
                  strokeOpacity={0.9}
                />
                <text
                  x={PAD.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill={tokens.muted}
                  fontSize={12}
                >
                  {`$${(tick / 1000).toFixed(1)}k`}
                </text>
              </g>
            );
          })}
          <g clipPath="url(#promo-equity-reveal)">
            <path d={area} fill="url(#promo-equity-fill)" />
            <path
              d={line}
              fill="none"
              stroke={tokens.chartWin}
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
          {points.map((point) => (
            <text
              key={point.label}
              x={point.x}
              y={HEIGHT - 8}
              textAnchor="middle"
              fill={tokens.muted}
              fontSize={12}
            >
              {point.label}
            </text>
          ))}
        </Interactive.Svg>
      </Interactive.Div>
    </ChartFrame>
  );
};
