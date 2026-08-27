import { Interactive } from "remotion";

type LogoMarkProps = {
  readonly size?: number;
};

export const LogoMark: React.FC<LogoMarkProps> = ({ size = 168 }) => {
  return (
    <Interactive.Svg
      name="Logo mark"
      viewBox="0 0 255 255"
      style={{
        width: size,
        height: size,
        display: "block",
      }}
    >
      <Interactive.Path
        name="Logo right"
        fill="#FFFFFF"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M159 63L127.5 0V255H255L236.5 218H159V63Z"
      />
      <Interactive.Path
        name="Logo left"
        fill="#FFFFFF"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 255L127.5 0V255H0ZM64 217L121 104V217H64Z"
      />
    </Interactive.Svg>
  );
};
