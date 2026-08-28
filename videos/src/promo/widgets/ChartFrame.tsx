import type { ReactNode } from "react";
import { Interactive } from "remotion";
import { tokens } from "../tokens";

type ChartFrameProps = {
  readonly name: string;
  readonly title: string;
  readonly children: ReactNode;
  readonly framed?: boolean;
};

export const ChartFrame: React.FC<ChartFrameProps> = ({
  name,
  title,
  children,
  framed = true,
}) => {
  return (
    <Interactive.Div
      name={name}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: tokens.canvas,
        borderRadius: framed ? 4 : 0,
        border: framed ? `1px solid ${tokens.border}` : "none",
      }}
    >
      {framed ? (
        <Interactive.Div
          name={`${name} header`}
          style={{
            display: "flex",
            alignItems: "center",
            height: 48,
            paddingLeft: 20,
            paddingRight: 20,
            borderBottom: `1px solid ${tokens.border}`,
            color: tokens.ink,
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          {title}
        </Interactive.Div>
      ) : null}
      <Interactive.Div
        name={`${name} body`}
        style={{
          flex: 1,
          minHeight: 0,
          padding: framed ? 16 : 0,
        }}
      >
        {children}
      </Interactive.Div>
    </Interactive.Div>
  );
};
