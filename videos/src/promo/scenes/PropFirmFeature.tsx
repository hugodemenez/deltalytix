import { Interactive } from "remotion";
import { PropFirmCard } from "../widgets/PropFirmCard";
import { promoPropAccounts, propFirmCaption } from "../widgets/product-copy";
import { FeatureChrome } from "./FeatureChrome";

export const PropFirmFeature: React.FC = () => {
  return (
    <FeatureChrome
      name="Prop firm feature"
      eyebrow={propFirmCaption.eyebrow}
      title={propFirmCaption.title}
    >
      <Interactive.Div
        name="Prop firm row"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 20,
          width: "100%",
          height: "100%",
        }}
      >
        {promoPropAccounts.map((account, index) => (
          <PropFirmCard
            key={account.number}
            account={account}
            delay={4 + index * 6}
          />
        ))}
      </Interactive.Div>
    </FeatureChrome>
  );
};
