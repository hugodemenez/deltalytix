import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontFamily } from "../../fonts";
import { tokens } from "../tokens";
import { buildPromoCalendar } from "./calendar-grid";
import { WEEKDAYS, formatUsd } from "./mock-data";

const calendar = buildPromoCalendar();

type CalendarWidgetProps = {
  readonly delay?: number;
};

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Interactive.Div
      name="Daily performance calendar"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: tokens.card,
        borderRadius: 8,
        overflow: "hidden",
        fontFamily,
        opacity: interpolate(frame, [delay, delay + 0.28 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        translate: interpolate(
          frame,
          [delay, delay + 0.4 * fps],
          ["0px 28px", "0px 0px"],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 16 }),
          },
        ),
      }}
    >
      <Interactive.Div
        name="Calendar header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          height: 56,
          paddingLeft: 20,
          paddingRight: 20,
          borderBottom: `1px solid ${tokens.border}`,
        }}
      >
        <Interactive.Div
          name="Calendar month"
          style={{
            color: tokens.ink,
            fontSize: 22,
            fontWeight: 600,
          }}
        >
          {calendar.label}
        </Interactive.Div>
        <Interactive.Div
          name="Calendar monthly total"
          style={{
            color: tokens.calendarWin,
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          {formatUsd(calendar.monthlyTotal)}
        </Interactive.Div>
      </Interactive.Div>
      <Interactive.Div
        name="Calendar grid"
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          padding: 12,
        }}
      >
        <Interactive.Div
          name="Weekday labels"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            marginBottom: 6,
          }}
        >
          {[...WEEKDAYS, "Weekly"].map((label) => (
            <Interactive.Div
              key={label}
              name={`${label} label`}
              style={{
                textAlign: "center",
                color: tokens.muted,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {label}
            </Interactive.Div>
          ))}
        </Interactive.Div>
        <Interactive.Div
          name="Calendar weeks"
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateRows: "repeat(6, 1fr)",
          }}
        >
          {calendar.weeks.map((week, weekIndex) => (
            <Interactive.Div
              key={`week-${weekIndex}`}
              name={`Week ${weekIndex + 1}`}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
              }}
            >
              {week.days.map((cell, dayIndex) => {
                    const cellDelay = delay + weekIndex + dayIndex * 0.35;
                const win = (cell.entry?.pnl ?? 0) >= 0;
                return (
                  <Interactive.Div
                    key={cell.iso}
                    name={`Day ${cell.iso}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      padding: 6,
                      outline: cell.isToday
                        ? `2px solid ${tokens.today}`
                        : `1px solid ${tokens.border}`,
                      backgroundColor: cell.entry
                        ? win
                          ? tokens.calendarWinBg
                          : tokens.calendarLossBg
                        : "transparent",
                      opacity: interpolate(
                        frame,
                        [cellDelay, cellDelay + 6],
                        [0, cell.inMonth ? 1 : 0.45],
                        {
                          extrapolateLeft: "clamp",
                          extrapolateRight: "clamp",
                        },
                      ),
                    }}
                  >
                    <Interactive.Div
                      name={`Day number ${cell.iso}`}
                      style={{
                        color: cell.isToday ? tokens.today : tokens.ink,
                        fontSize: 13,
                        fontWeight: cell.isToday ? 600 : 500,
                      }}
                    >
                      {cell.day}
                    </Interactive.Div>
                    <Interactive.Div
                      name={`Day pnl ${cell.iso}`}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        color: cell.entry
                          ? win
                            ? tokens.calendarWin
                            : tokens.calendarLoss
                          : tokens.muted,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {cell.entry ? formatUsd(cell.entry.pnl) : ""}
                    </Interactive.Div>
                    <Interactive.Div
                      name={`Day trades ${cell.iso}`}
                      style={{
                        color: tokens.muted,
                        fontSize: 11,
                        textAlign: "center",
                      }}
                    >
                      {cell.entry
                        ? `${cell.entry.tradeNumber} ${cell.entry.tradeNumber > 1 ? "trades" : "trade"}`
                        : ""}
                    </Interactive.Div>
                  </Interactive.Div>
                );
              })}
              <Interactive.Div
                key={`week-total-${weekIndex}`}
                name={`Week ${weekIndex + 1} total`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  outline: `1px solid ${tokens.border}`,
                  color:
                    week.weeklyTotal >= 0
                      ? tokens.calendarWin
                      : tokens.calendarLoss,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {formatUsd(week.weeklyTotal)}
              </Interactive.Div>
            </Interactive.Div>
          ))}
        </Interactive.Div>
      </Interactive.Div>
    </Interactive.Div>
  );
};
