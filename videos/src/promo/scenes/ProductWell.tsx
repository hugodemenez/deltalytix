import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontFamily } from "../../fonts";
import { tokens } from "../tokens";
import { CalendarWidget } from "../widgets/CalendarWidget";
import { DailyPnlChart } from "../widgets/DailyPnlChart";
import { EquityChart } from "../widgets/EquityChart";

export const ProductWell: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      name="Product well"
      style={{
        backgroundColor: tokens.sageWell,
        fontFamily,
      }}
    >
      <Interactive.Div
        name="Feature well"
        style={{
          position: "absolute",
          left: 40,
          top: 40,
          width: 1840,
          height: 1000,
          backgroundColor: tokens.featureWell,
          borderRadius: 4,
          scale: interpolate(frame, [0, 0.45 * fps], [0.94, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 16 }),
            output: "perceptual-scale",
          }),
        }}
      >
        <Interactive.Div
          name="Calendar column"
          style={{
            position: "absolute",
            left: 24,
            top: 24,
            width: 1048,
            height: 952,
          }}
        >
          <CalendarWidget delay={0} />
        </Interactive.Div>
        <Interactive.Div
          name="Equity column"
          style={{
            position: "absolute",
            left: 1096,
            top: 24,
            width: 720,
            height: 460,
          }}
        >
          <EquityChart delay={2} />
        </Interactive.Div>
        <Interactive.Div
          name="Daily P&L column"
          style={{
            position: "absolute",
            left: 1096,
            top: 508,
            width: 720,
            height: 468,
          }}
        >
          <DailyPnlChart delay={4} />
        </Interactive.Div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
