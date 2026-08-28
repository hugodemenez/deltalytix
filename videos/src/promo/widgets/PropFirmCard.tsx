import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { fontFamily } from "../../fonts";
import { tokens } from "../tokens";
import {
  propFirmCardCopy,
  type PromoPropAccount,
} from "./product-copy";

const BEZIER = Easing.bezier(0.16, 1, 0.3, 1);

const usd = (value: number) => `$${value.toFixed(2)}`;

type PropFirmCardProps = {
  readonly account: PromoPropAccount;
  readonly delay: number;
};

const chartPoints = (account: PromoPropAccount) => {
  const start = account.startingBalance;
  const end = account.currentBalance;
  const values = [
    start,
    start + (end - start) * 0.18,
    start + (end - start) * 0.22,
    start + (end - start) * 0.48,
    start + (end - start) * 0.44,
    start + (end - start) * 0.72,
    start + (end - start) * 0.86,
    end,
  ];
  const min = start - account.drawdown;
  const max = start + account.profitTarget;
  const w = 520;
  const h = 120;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - ((v - min) / (max - min)) * (h - 8) - 4;
  const line = values
    .map((value, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${y(value).toFixed(1)}`)
    .join(" ");
  return {
    line,
    targetY: y(start + account.profitTarget),
    drawdownY: y(start - account.drawdown),
    w,
    h,
  };
};

export const PropFirmCard: React.FC<PropFirmCardProps> = ({
  account,
  delay,
}) => {
  const frame = useCurrentFrame();
  const chart = chartPoints(account);
  const progressWidth = interpolate(frame, [delay + 10, delay + 36], [0, account.progress], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: BEZIER,
  });
  const drawdownWidth = interpolate(
    frame,
    [delay + 16, delay + 42],
    [0, account.drawdownProgress],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: BEZIER,
    },
  );
  const hiddenRight = interpolate(frame, [delay + 8, delay + 40], [100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: BEZIER,
  });
  const paymentHot = account.daysToPayment < 5;

  return (
    <Interactive.Div
      name={`${account.firm} card`}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: 20,
        backgroundColor: tokens.canvas,
        border: `1px solid ${tokens.border}`,
        borderRadius: 8,
        fontFamily,
        opacity: interpolate(frame, [delay, delay + 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: BEZIER,
        }),
        translate: interpolate(frame, [delay, delay + 12], ["0px 12px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: BEZIER,
        }),
      }}
    >
      <Interactive.Div
        name={`${account.firm} header`}
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          color: tokens.ink,
          fontSize: 18,
          fontWeight: 500,
        }}
      >
        <Interactive.Span name={`${account.firm} name`}>{account.firm}</Interactive.Span>
        <Interactive.Span
          name={`${account.firm} days`}
          style={{
            color: paymentHot ? tokens.destructive : tokens.muted,
            fontSize: 13,
            fontWeight: 400,
            flexShrink: 0,
          }}
        >
          {account.daysToPayment}
          {propFirmCardCopy.daysBeforeNextPayment}
        </Interactive.Span>
      </Interactive.Div>
      <Interactive.Div
        name={`${account.firm} number`}
        style={{
          marginTop: 4,
          color: tokens.muted,
          fontSize: 13,
        }}
      >
        {account.number}
      </Interactive.Div>

      <Interactive.Div
        name={`${account.firm} balance row`}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginTop: 16,
        }}
      >
        <Interactive.Span
          name={`${account.firm} balance label`}
          style={{ color: tokens.muted, fontSize: 15 }}
        >
          {propFirmCardCopy.balance}
        </Interactive.Span>
        <Interactive.Span
          name={`${account.firm} balance`}
          style={{
            color: tokens.ink,
            fontSize: 20,
            fontWeight: 500,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {usd(account.currentBalance)}
        </Interactive.Span>
      </Interactive.Div>

      <Interactive.Div
        name={`${account.firm} chart`}
        style={{
          position: "relative",
          width: "100%",
          height: 132,
          marginTop: 12,
        }}
      >
        <svg
          width={chart.w}
          height={chart.h}
          viewBox={`0 0 ${chart.w} ${chart.h}`}
          preserveAspectRatio="none"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <line
            x1={0}
            x2={chart.w}
            y1={chart.targetY}
            y2={chart.targetY}
            stroke={tokens.targetLine}
            strokeDasharray="4 4"
            strokeWidth={1}
          />
          <line
            x1={0}
            x2={chart.w}
            y1={chart.drawdownY}
            y2={chart.drawdownY}
            stroke={tokens.drawdownLine}
            strokeDasharray="4 4"
            strokeWidth={1}
          />
        </svg>
        <Interactive.Div
          name={`${account.firm} series`}
          style={{
            position: "absolute",
            inset: 0,
            clipPath: `inset(0 ${hiddenRight}% 0 0)`,
          }}
        >
          <svg
            width={chart.w}
            height={chart.h}
            viewBox={`0 0 ${chart.w} ${chart.h}`}
            preserveAspectRatio="none"
            style={{ width: "100%", height: "100%", display: "block" }}
          >
            <path
              d={chart.line}
              fill="none"
              stroke={tokens.balance}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </Interactive.Div>
      </Interactive.Div>

      <Interactive.Div name={`${account.firm} target`} style={{ marginTop: 14 }}>
        <Interactive.Div
          name={`${account.firm} target labels`}
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
            color: tokens.muted,
          }}
        >
          <Interactive.Span name={`${account.firm} remaining label`}>
            {propFirmCardCopy.remainingToTarget}
          </Interactive.Span>
          <Interactive.Span
            name={`${account.firm} remaining`}
            style={{ color: tokens.ink, fontVariantNumeric: "tabular-nums" }}
          >
            {usd(account.remainingToTarget)}
          </Interactive.Span>
        </Interactive.Div>
        <Interactive.Div
          name={`${account.firm} target track`}
          style={{
            marginTop: 6,
            height: 6,
            borderRadius: 99,
            backgroundColor: tokens.mutedFill,
            overflow: "hidden",
          }}
        >
          <Interactive.Div
            name={`${account.firm} target fill`}
            style={{
              width: `${progressWidth}%`,
              height: "100%",
              backgroundColor: tokens.progress,
            }}
          />
        </Interactive.Div>
      </Interactive.Div>

      <Interactive.Div name={`${account.firm} dd`} style={{ marginTop: 12 }}>
        <Interactive.Div
          name={`${account.firm} dd labels`}
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
            color: tokens.muted,
          }}
        >
          <Interactive.Span name={`${account.firm} dd label`}>
            {propFirmCardCopy.drawdown}
          </Interactive.Span>
          <Interactive.Span
            name={`${account.firm} dd remaining`}
            style={{
              color: tokens.positive,
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {propFirmCardCopy.remainingLoss(account.remainingLoss.toFixed(2))}
          </Interactive.Span>
        </Interactive.Div>
        <Interactive.Div
          name={`${account.firm} dd track`}
          style={{
            marginTop: 6,
            height: 6,
            borderRadius: 99,
            backgroundColor: tokens.mutedFill,
            overflow: "hidden",
          }}
        >
          <Interactive.Div
            name={`${account.firm} dd fill`}
            style={{
              width: `${drawdownWidth}%`,
              height: "100%",
              backgroundColor: tokens.destructive,
              opacity: 0.7,
            }}
          />
        </Interactive.Div>
      </Interactive.Div>

      <Interactive.Div
        name={`${account.firm} consistency`}
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: `1px solid ${tokens.border}`,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          color: tokens.muted,
        }}
      >
        <Interactive.Span name={`${account.firm} consistency label`}>
          {propFirmCardCopy.consistency}
        </Interactive.Span>
        <Interactive.Span
          name={`${account.firm} consistency value`}
          style={{ color: tokens.positive, fontWeight: 500 }}
        >
          {propFirmCardCopy.consistent}
        </Interactive.Span>
      </Interactive.Div>
      <Interactive.Div
        name={`${account.firm} days row`}
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
          fontSize: 13,
          color: tokens.muted,
        }}
      >
        <Interactive.Span name={`${account.firm} days label`}>
          {propFirmCardCopy.tradingDays}
        </Interactive.Span>
        <Interactive.Span
          name={`${account.firm} days value`}
          style={{ color: tokens.positive, fontWeight: 500 }}
        >
          {account.tradingDays}
        </Interactive.Span>
      </Interactive.Div>
    </Interactive.Div>
  );
};
