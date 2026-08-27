import { AbsoluteFill, Interactive } from "remotion";
import { fontFamily } from "../../fonts";
import { tokens } from "../tokens";
import { CalendarWidget } from "../widgets/CalendarWidget";
import { DailyPnlChart } from "../widgets/DailyPnlChart";
import { EquityChart } from "../widgets/EquityChart";

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
          name="Calendar column"
          style={{
            position: "absolute",
            left: 24,
            top: 24,
            width: 1048,
            height: 952,
          }}
        >
          <CalendarWidget delay={0} />
        </Interactive.Div>
        <Interactive.Div
          name="Equity column"
          style={{
            position: "absolute",
            left: 1096,
            top: 24,
            width: 720,
            height: 460,
          }}
        >
          <EquityChart />
        </Interactive.Div>
        <Interactive.Div
          name="Daily P&L column"
          style={{
            position: "absolute",
            left: 1096,
            top: 508,
            width: 720,
            height: 468,
          }}
        >
          <DailyPnlChart />
        </Interactive.Div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
