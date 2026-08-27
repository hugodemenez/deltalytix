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
            width: 1792,
            height: 168,
          }}
        >
          <StatWidgets immediate />
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 184,
            width: 1020,
            height: 644,
          }}
        >
          <CalendarWidget delay={-40} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 1036,
            top: 184,
            width: 756,
            height: 314,
          }}
        >
          <EquityChart delay={-20} drawFrames={1} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 1036,
            top: 514,
            width: 756,
            height: 314,
          }}
        >
          <DailyPnlChart delay={-40} barDrawFrames={1} staggerFrames={0} />
        </div>
      </div>
    </FeatureChrome>
  );
};
