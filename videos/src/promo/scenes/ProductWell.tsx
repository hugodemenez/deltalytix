import { FeatureChrome } from "./FeatureChrome";
import { DashboardOverview } from "../widgets/DashboardOverview";

/** Studio still of the first dashboard viewport, already filled. */
export const ProductWell: React.FC = () => {
  return (
    <FeatureChrome
      name="One dashboard"
      eyebrow="One dashboard"
      title="Calendar, equity, and P&L together."
    >
      <DashboardOverview draw={false} />
    </FeatureChrome>
  );
};
