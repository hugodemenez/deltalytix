import { AbsoluteFill, Interactive } from "remotion";
import { fontFamily } from "../../fonts";
import { tokens } from "../tokens";
import { CalendarWidget } from "../widgets/CalendarWidget";
import { DailyPnlChart } from "../widgets/DailyPnlChart";
import { EquityChart } from "../widgets/EquityChart";
import { StatWidgets } from "../widgets/StatWidgets";

export const ProductWell: React.FC = () => {
  return (
    <AbsoluteFill
      name="Product well"
      style={{
        backgroundColor: tokens.sageWell,
        fontFamily,
      }}
    >
      <Interactive.Div
        name="Feature well"
        style={{
          position: "absolute",
          left: 40,
          top: 40,
          width: 1840,
          height: 1000,
          backgroundColor: tokens.featureWell,
          borderRadius: 4,
        }}
      >
        <Interactive.Div
          name="Statistics row"
          style={{
            position: "absolute",
            left: 24,
            top: 24,
            width: 1792,
            height: 208,
          }}
        >
          <StatWidgets />
        </Interactive.Div>
        <Interactive.Div
          name="Calendar column"
          style={{
            position: "absolute",
            left: 24,
            top: 248,
            width: 1020,
            height: 728,
          }}
        >
          <CalendarWidget delay={4} />
        </Interactive.Div>
        <Interactive.Div
          name="Equity column"
          style={{
            position: "absolute",
            left: 1060,
            top: 248,
            width: 756,
            height: 356,
          }}
        >
          <EquityChart />
        </Interactive.Div>
        <Interactive.Div
          name="Daily P&L column"
          style={{
            position: "absolute",
            left: 1060,
            top: 620,
            width: 756,
            height: 356,
          }}
        >
          <DailyPnlChart />
        </Interactive.Div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
