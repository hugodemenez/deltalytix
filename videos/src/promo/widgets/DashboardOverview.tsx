import { CalendarWidget } from "../widgets/CalendarWidget";
import { DailyPnlChart } from "../widgets/DailyPnlChart";
import { EquityChart } from "../widgets/EquityChart";
import { StatWidgets } from "../widgets/StatWidgets";

/** Assembled first viewport: stats + calendar + equity + daily P&L. */
export const DashboardOverview: React.FC<{ readonly draw?: boolean }> = ({
  draw = true,
}) => {
  return (
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
        <CalendarWidget delay={draw ? 4 : -40} />
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
        <EquityChart
          delay={draw ? 8 : -20}
          drawFrames={draw ? undefined : 1}
        />
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
        <DailyPnlChart
          delay={draw ? 12 : -40}
          barDrawFrames={draw ? undefined : 1}
          staggerFrames={draw ? undefined : 0}
        />
      </div>
    </div>
  );
};
