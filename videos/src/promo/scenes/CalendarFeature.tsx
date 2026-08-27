import { CalendarWidget } from "../widgets/CalendarWidget";
import { FeatureChrome } from "./FeatureChrome";

export const CalendarFeature: React.FC = () => {
  return (
    <FeatureChrome
      name="Calendar feature"
      eyebrow="Daily performance"
      title="August, day by day."
    >
      <CalendarWidget delay={6} weekStagger={5} dayStagger={1.5} />
    </FeatureChrome>
  );
};
