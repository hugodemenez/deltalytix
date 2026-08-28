import { DailyPnlChart } from "../widgets/DailyPnlChart";
import { FeatureChrome } from "./FeatureChrome";

export const PnlFeature: React.FC = () => {
  return (
    <FeatureChrome
      name="P&L feature"
      eyebrow="Track your performance"
      title="Daily P&L, win and loss."
    >
      <DailyPnlChart framed={false} />
    </FeatureChrome>
  );
};
