import { AbsoluteFill, useCurrentFrame } from "remotion";

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

/** Light paper grain. Intro/CTA only — never over chart axes. */
export const FilmGrain: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Film grain"
      style={{
        pointerEvents: "none",
        backgroundImage: NOISE,
        backgroundSize: "180px 180px",
        backgroundPosition: `${(frame * 5) % 180}px ${(frame * 11) % 180}px`,
        mixBlendMode: "multiply",
        opacity: 0.035,
      }}
    />
  );
};
