import type { ReactNode } from "react";
import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { fontFamily } from "../../fonts";
import { tokens } from "../tokens";

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
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name={name}
      style={{
        backgroundColor: tokens.sageWell,
        fontFamily,
      }}
    >
      <Interactive.Div
        name={`${name} well`}
        style={{
          position: "absolute",
          left: 40,
          top: 40,
          width: 1840,
          height: 1000,
          backgroundColor: tokens.featureWell,
          borderRadius: 4,
        }}
      >
        <Interactive.Div
          name={`${name} caption`}
          style={{
            position: "absolute",
            left: 40,
            top: 28,
            width: 1760,
            opacity: interpolate(frame, [0, 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: BEZIER,
            }),
          }}
        >
          <Interactive.Div
            name={`${name} eyebrow`}
            style={{
              color: tokens.positive,
              fontSize: 18,
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
              marginTop: 10,
              color: tokens.ink,
              fontSize: 44,
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
            left: 24,
            top: 148,
            width: 1792,
            height: 828,
          }}
        >
          {children}
        </Interactive.Div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
