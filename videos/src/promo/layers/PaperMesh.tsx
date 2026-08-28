import { AbsoluteFill, useCurrentFrame } from "remotion";
import { tokens } from "../tokens";

/**
 * Soft ambient glow for type-only scenes. Keep this off any parent of chart axes.
 */
export const PaperMesh: React.FC = () => {
  const frame = useCurrentFrame();
  const driftA = Math.sin(frame / 48) * 28;
  const driftB = Math.cos(frame / 62) * 22;

  return (
    <AbsoluteFill name="Paper mesh" style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 980,
          height: 980,
          borderRadius: "50%",
          top: -420,
          right: -280 + driftA,
          background: `radial-gradient(circle, ${tokens.chartWin} 0%, transparent 68%)`,
          filter: "blur(8px)",
          opacity: 0.08,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 760,
          height: 760,
          borderRadius: "50%",
          bottom: -360,
          left: -240 + driftB,
          background: `radial-gradient(circle, ${tokens.ink} 0%, transparent 70%)`,
          filter: "blur(12px)",
          opacity: 0.04,
        }}
      />
    </AbsoluteFill>
  );
};
