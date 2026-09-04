import type { ReactNode } from "react";
import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { fontFamily } from "../../fonts";
import { usePromoTokens } from "../tokens";

const BEZIER = Easing.bezier(0.16, 1, 0.3, 1);

type FeatureChromeProps = {
  readonly name: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly children: ReactNode;
};

export const FeatureChrome: React.FC<FeatureChromeProps> = ({
  name,
  eyebrow,
  title,
  children,
}) => {
  const tokens = usePromoTokens();
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name={name}
      style={{
        backgroundColor: tokens.canvas,
        fontFamily,
      }}
    >
      <Interactive.Div
        name={`${name} caption`}
        style={{
          position: "absolute",
          left: 80,
          top: 56,
          width: 1760,
          opacity: interpolate(frame, [0, 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: BEZIER,
          }),
        }}
      >
        <Interactive.Div
          name={`${name} eyebrow`}
          style={{
            color: tokens.muted,
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </Interactive.Div>
        <Interactive.Div
          name={`${name} title`}
          style={{
            marginTop: 8,
            color: tokens.ink,
            fontSize: 40,
            fontWeight: 300,
            letterSpacing: "-0.05em",
            lineHeight: 1.1,
          }}
        >
          {title}
        </Interactive.Div>
      </Interactive.Div>
      <Interactive.Div
        name={`${name} stage`}
        style={{
          position: "absolute",
          left: 80,
          top: 160,
          width: 1760,
          height: 860,
        }}
      >
        {children}
      </Interactive.Div>
    </AbsoluteFill>
  );
};
