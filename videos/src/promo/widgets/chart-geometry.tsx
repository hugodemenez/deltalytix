import { memo, type ReactNode } from "react";
import { fontFamily } from "../../fonts";
import { usePromoTokens } from "../tokens";
import { dailyPnlData, equityData, formatUsd } from "./mock-data";

export const CHART_WIDTH = 680;
export const CHART_HEIGHT = 360;
export const CHART_PAD = { top: 16, right: 16, bottom: 36, left: 64 } as const;

const equityValues = equityData.map((point) => point.value);
export const EQUITY_MIN = Math.min(...equityValues) - 120;
export const EQUITY_MAX = Math.max(...equityValues) + 120;
export const EQUITY_CHART_W = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
export const EQUITY_CHART_H = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;

export const equityPoints = equityData.map((point, index) => ({
  x: Math.round(
    CHART_PAD.left + (index / (equityData.length - 1)) * EQUITY_CHART_W,
  ),
  y: Math.round(
    CHART_PAD.top +
      (1 - (point.value - EQUITY_MIN) / (EQUITY_MAX - EQUITY_MIN)) *
        EQUITY_CHART_H,
  ),
  label: point.label,
}));

export const equityLine = equityPoints
  .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
  .join(" ");

export const equityArea = `${equityLine} L ${equityPoints[equityPoints.length - 1].x} ${CHART_PAD.top + EQUITY_CHART_H} L ${equityPoints[0].x} ${CHART_PAD.top + EQUITY_CHART_H} Z`;

export const equityYTicks = [
  { value: EQUITY_MIN, label: `$${(EQUITY_MIN / 1000).toFixed(1)}k` },
  {
    value: (EQUITY_MIN + EQUITY_MAX) / 2,
    label: `$${(((EQUITY_MIN + EQUITY_MAX) / 2) / 1000).toFixed(1)}k`,
  },
  { value: EQUITY_MAX, label: `$${(EQUITY_MAX / 1000).toFixed(1)}k` },
].map((tick) => ({
  ...tick,
  y: Math.round(
    CHART_PAD.top +
      (1 - (tick.value - EQUITY_MIN) / (EQUITY_MAX - EQUITY_MIN)) *
        EQUITY_CHART_H,
  ),
}));

export const PNL_MAX_ABS = Math.max(
  ...dailyPnlData.map((point) => Math.abs(point.value)),
);
export const PNL_CHART_W = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
export const PNL_CHART_H = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;
export const PNL_ZERO_Y = Math.round(CHART_PAD.top + PNL_CHART_H / 2);
export const PNL_SLOT = PNL_CHART_W / dailyPnlData.length;
export const PNL_BAR_W = Math.round(Math.min(34, PNL_SLOT * 0.55));

const svgBox = {
  width: "100%",
  height: "100%",
  display: "block",
  overflow: "visible",
} as const;

type SvgRootProps = {
  readonly children: ReactNode;
};

const SvgRoot: React.FC<SvgRootProps> = ({ children }) => {
  return (
    <svg
      width={CHART_WIDTH}
      height={CHART_HEIGHT}
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      style={svgBox}
    >
      {children}
    </svg>
  );
};

export const EquityAxes = memo(function EquityAxes() {
  const tokens = usePromoTokens();

  return (
    <SvgRoot>
      {equityYTicks.map((tick) => (
        <g key={tick.label}>
          <line
            x1={CHART_PAD.left}
            x2={CHART_WIDTH - CHART_PAD.right}
            y1={tick.y}
            y2={tick.y}
            stroke={tokens.border}
            shapeRendering="crispEdges"
          />
          <text
            x={CHART_PAD.left - 10}
            y={tick.y + 4}
            textAnchor="end"
            fill={tokens.muted}
            fontSize={12}
            fontFamily={fontFamily}
          >
            {tick.label}
          </text>
        </g>
      ))}
      {equityPoints.map((point) => (
        <text
          key={point.label}
          x={point.x}
          y={CHART_HEIGHT - 8}
          textAnchor="middle"
          fill={tokens.muted}
          fontSize={12}
          fontFamily={fontFamily}
        >
          {point.label}
        </text>
      ))}
    </SvgRoot>
  );
});

export const DailyPnlAxes = memo(function DailyPnlAxes() {
  const tokens = usePromoTokens();

  return (
    <SvgRoot>
      <line
        x1={CHART_PAD.left}
        x2={CHART_WIDTH - CHART_PAD.right}
        y1={PNL_ZERO_Y}
        y2={PNL_ZERO_Y}
        stroke={tokens.border}
        shapeRendering="crispEdges"
      />
      <text
        x={CHART_PAD.left - 10}
        y={CHART_PAD.top + 4}
        textAnchor="end"
        fill={tokens.muted}
        fontSize={12}
        fontFamily={fontFamily}
      >
        {formatUsd(PNL_MAX_ABS)}
      </text>
      <text
        x={CHART_PAD.left - 10}
        y={CHART_PAD.top + PNL_CHART_H}
        textAnchor="end"
        fill={tokens.muted}
        fontSize={12}
        fontFamily={fontFamily}
      >
        {formatUsd(-PNL_MAX_ABS)}
      </text>
      {dailyPnlData.map((point, index) => {
        const x = Math.round(
          CHART_PAD.left + PNL_SLOT * index + (PNL_SLOT - PNL_BAR_W) / 2,
        );
        return (
          <text
            key={point.label}
            x={x + PNL_BAR_W / 2}
            y={CHART_HEIGHT - 8}
            textAnchor="middle"
            fill={tokens.muted}
            fontSize={12}
            fontFamily={fontFamily}
          >
            {point.label}
          </text>
        );
      })}
    </SvgRoot>
  );
});
