import { Interactive } from "remotion";
import { StatWidgets } from "../widgets/StatWidgets";
import { FeatureChrome } from "./FeatureChrome";

export const StatsFeature: React.FC = () => {
  return (
    <FeatureChrome
      name="Stats feature"
      eyebrow="See what happened"
      title="Performance, in one dashboard."
    >
      <Interactive.Div
        name="Stats stage"
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: "100%",
        }}
      >
        <Interactive.Div
          name="Stats row"
          style={{
            width: "100%",
            height: 420,
          }}
        >
          <StatWidgets size="feature" />
        </Interactive.Div>
      </Interactive.Div>
    </FeatureChrome>
  );
};
