import { CalendarWidget } from "../widgets/CalendarWidget";
import { FeatureChrome } from "./FeatureChrome";

export const CalendarFeature: React.FC = () => {
  return (
    <FeatureChrome
      name="Calendar feature"
      eyebrow="Daily performance"
      title="August, day by day."
    >
      <CalendarWidget delay={4} weekStagger={2} dayStagger={0.6} framed={false} />
    </FeatureChrome>
  );
};
