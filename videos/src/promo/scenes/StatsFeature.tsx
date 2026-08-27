import { StatWidgets } from "../widgets/StatWidgets";
import { FeatureChrome } from "./FeatureChrome";

export const StatsFeature: React.FC = () => {
  return (
    <FeatureChrome
      name="Stats feature"
      eyebrow="See what happened"
      title="Performance, in one dashboard."
    >
      <StatWidgets size="feature" />
    </FeatureChrome>
  );
};
