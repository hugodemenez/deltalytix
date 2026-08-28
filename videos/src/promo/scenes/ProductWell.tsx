import { CalendarWidget } from "../widgets/CalendarWidget";
import { DailyPnlChart } from "../widgets/DailyPnlChart";
import { EquityChart } from "../widgets/EquityChart";
import { StatWidgets } from "../widgets/StatWidgets";
import { FeatureChrome } from "./FeatureChrome";

export const ProductWell: React.FC = () => {
  return (
    <FeatureChrome
      name="One dashboard"
      eyebrow="One dashboard"
      title="Calendar, equity, and P&L together."
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1760,
            height: 140,
          }}
        >
          <StatWidgets immediate />
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 156,
            width: 1024,
            height: 704,
          }}
        >
          <CalendarWidget delay={-40} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 1040,
            top: 156,
            width: 720,
            height: 344,
          }}
        >
          <EquityChart delay={-20} drawFrames={1} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 1040,
            top: 516,
            width: 720,
            height: 344,
          }}
        >
          <DailyPnlChart delay={-40} barDrawFrames={1} staggerFrames={0} />
        </div>
      </div>
    </FeatureChrome>
  );
};
