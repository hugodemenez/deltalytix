import { Interactive } from "remotion";

type IconProps = {
  readonly name: string;
  readonly size: number;
  readonly color: string;
};

const svg = (size: number) =>
  ({
    width: size,
    height: size,
    display: "block",
    flexShrink: 0,
  }) as const;

export const DatabaseIcon: React.FC<IconProps> = ({ name, size, color }) => (
  <Interactive.Svg name={name} viewBox="0 0 24 24" style={svg(size)}>
    <ellipse cx="12" cy="5" rx="9" ry="3" fill="none" stroke={color} strokeWidth="1.75" />
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" fill="none" stroke={color} strokeWidth="1.75" />
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" fill="none" stroke={color} strokeWidth="1.75" />
  </Interactive.Svg>
);

export const PlusIcon: React.FC<IconProps> = ({ name, size, color }) => (
  <Interactive.Svg name={name} viewBox="0 0 24 24" style={svg(size)}>
    <path d="M12 5v14M5 12h14" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
  </Interactive.Svg>
);

export const SendIcon: React.FC<IconProps> = ({ name, size, color }) => (
  <Interactive.Svg name={name} viewBox="0 0 24 24" style={svg(size)}>
    <path
      d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"
      fill="none"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Interactive.Svg>
);

export const RotateCcwIcon: React.FC<IconProps> = ({ name, size, color }) => (
  <Interactive.Svg name={name} viewBox="0 0 24 24" style={svg(size)}>
    <path
      d="M3 12a9 9 0 1 0 3-6.7L3 8"
      fill="none"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
    />
    <path d="M3 3v5h5" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </Interactive.Svg>
);

export const RefreshIcon: React.FC<IconProps> = ({ name, size, color }) => (
  <Interactive.Svg name={name} viewBox="0 0 24 24" style={svg(size)}>
    <path
      d="M21 12a9 9 0 0 0-15.5-6.3L3 8M3 12a9 9 0 0 0 15.5 6.3L21 16"
      fill="none"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
    />
    <path d="M3 3v5h5M21 21v-5h-5" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </Interactive.Svg>
);

/** Wordmark-free FTMO diamond from platforms.tsx `FtmoLogo`. */
export const FtmoMark: React.FC<IconProps> = ({ name, size, color }) => (
  <Interactive.Svg
    name={name}
    viewBox="0 0 1058 1000"
    style={{
      width: size,
      height: size,
      display: "block",
      flexShrink: 0,
    }}
  >
    <path d="M117.066 617.598L497.981 235.197V0L0 500.075L117.066 617.598Z" fill={color} />
    <path d="M498.028 999.987V674.388L335.936 837.263L498.028 999.987Z" fill={color} />
    <path d="M497.943 334.323L166.405 667.154L286.323 787.54L497.943 575.095V334.323Z" fill={color} />
    <path d="M560.322 0V235.197L824.021 499.925L560.322 764.803V1000L1058.3 499.925L560.322 0Z" fill={color} />
  </Interactive.Svg>
);
