import { AbsoluteFill, useCurrentFrame } from "remotion";
import { tokens } from "../tokens";

/**
 * Drifting sage blobs. Keep this off any parent of chart axes.
 */
export const PaperMesh: React.FC = () => {
  const frame = useCurrentFrame();
  const driftA = Math.sin(frame / 48) * 36;
  const driftB = Math.cos(frame / 62) * 28;

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
          background: `radial-gradient(circle, ${tokens.sageWell} 0%, transparent 68%)`,
          filter: "blur(8px)",
          opacity: 0.9,
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
          background: `radial-gradient(circle, ${tokens.positive}22 0%, transparent 70%)`,
          filter: "blur(12px)",
          opacity: 0.85,
        }}
      />
    </AbsoluteFill>
  );
};
