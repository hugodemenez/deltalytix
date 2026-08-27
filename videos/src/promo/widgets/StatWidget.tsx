import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { fontFamily } from "../../fonts";
import { tokens } from "../tokens";
import { equityData } from "./mock-data";

const SPARK_W = 520;
const SPARK_H = 44;
const BEZIER = Easing.bezier(0.16, 1, 0.3, 1);

const sparkValues = equityData.map((point) => point.value);
const sparkMin = Math.min(...sparkValues);
const sparkMax = Math.max(...sparkValues);
const sparkPath = sparkValues
  .map((value, index) => {
    const x = (index / (sparkValues.length - 1)) * SPARK_W;
    const y =
      SPARK_H - ((value - sparkMin) / (sparkMax - sparkMin)) * (SPARK_H - 4) - 2;
    return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  })
  .join(" ");

type StatWidgetProps = {
  readonly name: string;
  readonly label: string;
  readonly note?: string;
  readonly delay: number;
  readonly children: React.ReactNode;
  readonly sparkline?: boolean;
  readonly valueColor?: string;
};

export const StatWidget: React.FC<StatWidgetProps> = ({
  name,
  label,
  note,
  delay,
  children,
  sparkline = false,
  valueColor = tokens.ink,
}) => {
  const frame = useCurrentFrame();

  return (
    <Interactive.Div
      name={name}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundColor: tokens.card,
        borderRadius: 8,
        border: `1px solid ${tokens.border}`,
        paddingLeft: 28,
        paddingRight: 28,
        fontFamily,
        opacity: interpolate(frame, [delay, delay + 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: BEZIER,
        }),
        translate: interpolate(
          frame,
          [delay, delay + 12],
          ["0px 16px", "0px 0px"],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: BEZIER,
          },
        ),
      }}
    >
      <Interactive.Div
        name={`${name} label`}
        style={{
          color: tokens.muted,
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </Interactive.Div>
      <Interactive.Div
        name={`${name} value`}
        style={{
          marginTop: 10,
          color: valueColor,
          fontSize: 56,
          fontWeight: 300,
          letterSpacing: "-0.06em",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {children}
      </Interactive.Div>
      {sparkline ? (
        <Interactive.Svg
          name={`${name} sparkline`}
          viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
          style={{
            width: "100%",
            height: 40,
            marginTop: 14,
            display: "block",
          }}
        >
          <Interactive.Path
            name={`${name} spark path`}
            d={sparkPath}
            fill="none"
            stroke={tokens.chartWin}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 800,
              strokeDashoffset: interpolate(
                frame,
                [delay + 8, delay + 36],
                [800, 0],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: BEZIER,
                },
              ),
            }}
          />
        </Interactive.Svg>
      ) : null}
      {note ? (
        <Interactive.Div
          name={`${name} note`}
          style={{
            marginTop: 12,
            color: tokens.muted,
            fontSize: 16,
            fontWeight: 400,
          }}
        >
          {note}
        </Interactive.Div>
      ) : null}
    </Interactive.Div>
  );
};
