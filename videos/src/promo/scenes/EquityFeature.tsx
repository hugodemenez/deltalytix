import { EquityChart } from "../widgets/EquityChart";
import { FeatureChrome } from "./FeatureChrome";

export const EquityFeature: React.FC = () => {
  return (
    <FeatureChrome
      name="Equity feature"
      eyebrow="Track your performance"
      title="Equity across the month."
    >
      <EquityChart framed={false} />
    </FeatureChrome>
  );
};
