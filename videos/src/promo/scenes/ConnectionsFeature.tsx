import { ConnectionsWidget } from "../widgets/ConnectionsWidget";
import { connectionsFeatureCaption } from "../widgets/product-copy";
import { FeatureChrome } from "./FeatureChrome";

export const ConnectionsFeature: React.FC = () => {
  return (
    <FeatureChrome
      name="Connections feature"
      eyebrow={connectionsFeatureCaption.eyebrow}
      title={connectionsFeatureCaption.title}
    >
      <ConnectionsWidget />
    </FeatureChrome>
  );
};
