import { ChatWidget } from "../widgets/ChatWidget";
import { chatFeatureCaption } from "../widgets/product-copy";
import { FeatureChrome } from "./FeatureChrome";

export const ChatFeature: React.FC = () => {
  return (
    <FeatureChrome
      name="Chat feature"
      eyebrow={chatFeatureCaption.eyebrow}
      title={chatFeatureCaption.title}
    >
      <ChatWidget />
    </FeatureChrome>
  );
};
