import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { tokens } from "../tokens";

const BEZIER = Easing.bezier(0.16, 1, 0.3, 1);

const stem = (word: string) => word.replace(/[.,!?]/g, "").toLowerCase();

type WordRevealProps = {
  readonly name: string;
  readonly text: string;
  readonly delay?: number;
  readonly per?: number;
  readonly fontSize: number;
  readonly color: string;
  readonly highlight?: string;
};

export const WordReveal: React.FC<WordRevealProps> = ({
  name,
  text,
  delay = 0,
  per = 4,
  fontSize,
  color,
  highlight,
}) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");

  return (
    <Interactive.Div
      name={name}
      style={{
        display: "flex",
        flexWrap: "wrap",
        columnGap: 22,
        rowGap: 0,
      }}
    >
      {words.map((word, index) => {
        const start = delay + index * per;
        const marked = Boolean(highlight && stem(word) === stem(highlight));
        return (
          <Interactive.Div
            key={`${word}-${index}`}
            name={`${name} ${word}`}
            style={{
              position: "relative",
              color,
              fontSize,
              fontWeight: 300,
              letterSpacing: "-0.06em",
              lineHeight: 0.96,
              opacity: interpolate(frame, [start, start + 10], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: BEZIER,
              }),
              translate: interpolate(
                frame,
                [start, start + 12],
                ["0px 28px", "0px 0px"],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: BEZIER,
                },
              ),
            }}
          >
            {marked ? (
              <Interactive.Div
                name={`${name} highlight`}
                style={{
                  position: "absolute",
                  left: -10,
                  right: -10,
                  top: "12%",
                  bottom: "8%",
                  borderRadius: 6,
                  backgroundColor: tokens.positive,
                  opacity: 0.18,
                  transformOrigin: "left center",
                  scale: interpolate(frame, [start + 8, start + 18], [0.08, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: BEZIER,
                    output: "perceptual-scale",
                  }),
                }}
              />
            ) : null}
            {word}
          </Interactive.Div>
        );
      })}
    </Interactive.Div>
  );
};
