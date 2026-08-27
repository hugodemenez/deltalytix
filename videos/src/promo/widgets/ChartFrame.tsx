import type { ReactNode } from "react";
import { Interactive } from "remotion";
import { tokens } from "../tokens";

type ChartFrameProps = {
  readonly name: string;
  readonly title: string;
  readonly children: ReactNode;
};

export const ChartFrame: React.FC<ChartFrameProps> = ({
  name,
  title,
  children,
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
        backgroundColor: tokens.card,
        borderRadius: 8,
        border: `1px solid ${tokens.border}`,
      }}
    >
      <Interactive.Div
        name={`${name} header`}
        style={{
          display: "flex",
          alignItems: "center",
          height: 56,
          paddingLeft: 20,
          paddingRight: 20,
          borderBottom: `1px solid ${tokens.border}`,
          color: tokens.ink,
          fontSize: 18,
          fontWeight: 500,
        }}
      >
        {title}
      </Interactive.Div>
      <Interactive.Div
        name={`${name} body`}
        style={{
          flex: 1,
          minHeight: 0,
          padding: 16,
        }}
      >
        {children}
      </Interactive.Div>
    </Interactive.Div>
  );
};
