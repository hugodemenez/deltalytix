import * as React from "react";
import { Head, Html, Preview } from "@react-email/components";

export interface TraderStatsEmailProps {
  email: string;
  firstName?: string;
  dailyPnL: {
    date: Date;
    pnl: number;
  }[];
  winLossStats: {
    wins: number;
    losses: number;
  };
  resultAnalysisIntro: string;
  tipsForNextWeek: string;
  language?: string;
}

type Locale = "en" | "fr";

const FONT =
  "Geist,Arial,Helvetica,sans-serif";

const translations = {
  en: {
    preview: "Your weekly trading recap - Deltalytix",
    greeting: "Hello",
    disclaimer:
      "This recap is generated automatically and may contain errors.",
    weekOf: (range: string) => `Week of ${range}`,
    netPnL: "Net P&L",
    daily: "Daily",
    winsAndLosses: "Wins and losses",
    wins: "Wins",
    losses: "Losses",
    winRate: "Win rate",
    bookCall: "Book a call*",
    visitDashboard: "Visit dashboard",
    callDisclaimer:
      "*This call is 100% free. Take it as an opportunity to speak with a fellow trader and reflect on your trading.",
    founder: "Founder of Deltalytix",
    unsubscribe: "Unsubscribe",
    privacy: "Privacy policy",
    optedIn:
      "You’re receiving this email because you opted in to weekly trading recaps from Deltalytix.",
    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const,
    months: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ] as const,
  },
  fr: {
    preview: "Votre récapitulatif de trading de la semaine - Deltalytix",
    greeting: "Bonjour",
    disclaimer:
      "Ce récapitulatif est généré automatiquement et peut contenir des erreurs.",
    weekOf: (range: string) => `Semaine du ${range}`,
    netPnL: "P&L net",
    daily: "Journalier",
    winsAndLosses: "Gains et pertes",
    wins: "Gains",
    losses: "Pertes",
    winRate: "Taux de gains",
    bookCall: "Réserver un appel*",
    visitDashboard: "Visiter le tableau de bord",
    callDisclaimer:
      "*Cet appel est 100% gratuit. Profitez-en pour échanger avec un autre trader et réfléchir à votre trading.",
    founder: "Fondateur de Deltalytix",
    unsubscribe: "Se désabonner",
    privacy: "Politique de confidentialité",
    optedIn:
      "Vous recevez cet email car vous avez choisi de recevoir le récapitulatif hebdomadaire de Deltalytix.",
    weekdays: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const,
    months: [
      "janv.",
      "févr.",
      "mars",
      "avr.",
      "mai",
      "juin",
      "juil.",
      "août",
      "sept.",
      "oct.",
      "nov.",
      "déc.",
    ] as const,
  },
} as const;

/** Zeno PR439 chrome CSS — exact from live broadcasts EN b2119984 / FR 9d018101. */
const zenoChromeCss = `
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  .dm-bg { background-color:#111411 !important; }
  .dm-heading { color:#f3f6f2 !important; }
  .dm-text { color:#b8c1b8 !important; }
  .dm-surface-green { background-color:#19231b !important; }
  .dm-surface-neutral { background-color:#1b1f1b !important; }
  .dm-border { border-color:#343b34 !important; }
  .dm-button { background-color:#edf2ec !important; }
  .dm-button-link { color:#151915 !important; }
  .dm-image { border-color:#394139 !important; }
}
[data-ogsc] .dm-bg { background-color:#111411 !important; }
[data-ogsc] .dm-heading { color:#f3f6f2 !important; }
[data-ogsc] .dm-text { color:#b8c1b8 !important; }
[data-ogsc] .dm-surface-green { background-color:#19231b !important; }
[data-ogsc] .dm-surface-neutral { background-color:#1b1f1b !important; }
[data-ogsc] .dm-border { border-color:#343b34 !important; }
[data-ogsc] .dm-button { background-color:#edf2ec !important; }
[data-ogsc] .dm-button-link { color:#151915 !important; }
[data-ogsc] .dm-image { border-color:#394139 !important; }
img.brand-mark-dark { display: none !important; max-height: 0 !important; overflow: hidden !important; }
@media (prefers-color-scheme: dark) {
  img.brand-mark-light { display: none !important; max-height: 0 !important; overflow: hidden !important; }
  img.brand-mark-dark { display: inline-block !important; max-height: none !important; overflow: visible !important; width: 22px !important; height: 22px !important; }
}
[data-ogsc] img.brand-mark-light { display: none !important; max-height: 0 !important; overflow: hidden !important; }
[data-ogsc] img.brand-mark-dark { display: inline-block !important; max-height: none !important; overflow: visible !important; width: 22px !important; height: 22px !important; }
`;

const colors = {
  positive: "#16A34A",
  negative: "#DC2626",
  ink: "#1e231e",
  hairline: "#E5E5E5",
  listBorder: "#e7e9e5",
} as const;

function toUtcDate(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function getUtcMonday(date: Date): Date {
  const d = toUtcDate(date);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function addUtcDays(date: Date, days: number): Date {
  const d = toUtcDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function dateKey(date: Date): string {
  return toUtcDate(date).toISOString().slice(0, 10);
}

function resolveWeekStart(dailyPnL: TraderStatsEmailProps["dailyPnL"]): Date {
  if (dailyPnL.length === 0) {
    return getUtcMonday(new Date());
  }
  const latest = dailyPnL.reduce((max, day) =>
    toUtcDate(day.date).getTime() > toUtcDate(max.date).getTime() ? day : max,
  );
  return getUtcMonday(latest.date);
}

function formatDayMonth(
  date: Date,
  months: readonly string[],
): string {
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]}`;
}

function formatWeekRange(
  weekStart: Date,
  months: readonly string[],
): string {
  const weekEnd = addUtcDays(weekStart, 6);
  const startDay = weekStart.getUTCDate();
  const endDay = weekEnd.getUTCDate();
  const startMonth = months[weekStart.getUTCMonth()];
  const endMonth = months[weekEnd.getUTCMonth()];

  if (weekStart.getUTCMonth() === weekEnd.getUTCMonth()) {
    return `${startDay}–${endDay} ${startMonth}`;
  }

  return `${startDay} ${startMonth}–${endDay} ${endMonth}`;
}

function formatPnLMagnitude(value: number): string {
  // Lock shows full euro amounts (e.g. +875€) — never K-truncate in this recap.
  return Math.trunc(Math.abs(value)).toString();
}

function formatSignedEuro(pnl: number): string {
  const amount = formatPnLMagnitude(pnl);
  if (pnl > 0) return `+${amount}€`;
  if (pnl < 0) return `−${amount}€`;
  return `${amount}€`;
}

function pnlColor(pnl: number): string {
  if (pnl > 0) return colors.positive;
  if (pnl < 0) return colors.negative;
  return colors.ink;
}

function buildWeekDays(
  weekStart: Date,
  dailyPnL: TraderStatsEmailProps["dailyPnL"],
): Array<{ date: Date; pnl: number | null }> {
  const byDate = new Map(
    dailyPnL.map((day) => [dateKey(day.date), day.pnl] as const),
  );

  return Array.from({ length: 7 }, (_, index) => {
    const date = addUtcDays(weekStart, index);
    const key = dateKey(date);
    return {
      date,
      pnl: byDate.has(key) ? (byDate.get(key) as number) : null,
    };
  });
}

function withUtm(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}utm_source=resend&utm_medium=email&utm_campaign=weekly_recap`;
}

function Spacer({ height }: { height: number }) {
  return (
    <table
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      role="presentation"
    >
      <tbody>
        <tr>
          <td
            height={height}
            style={{
              height: `${height}px`,
              fontSize: "1px",
              lineHeight: "1px",
            }}
          >
            &nbsp;
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export default function TraderStatsEmail({
  email,
  firstName = "trader",
  dailyPnL,
  winLossStats,
  resultAnalysisIntro,
  tipsForNextWeek,
  language = "fr",
}: TraderStatsEmailProps) {
  const locale: Locale = language === "en" ? "en" : "fr";
  const t = translations[locale];

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.deltalytix.app").replace(
    /\/$/,
    "",
  );
  const dashboardUrl = withUtm(`${baseUrl}/${locale}/dashboard`);
  const bookCallUrl = withUtm(
    "https://cal.com/hugo-demenez/deltalytix-discussion",
  );
  const privacyUrl = `${baseUrl}/${locale}/privacy`;
  const unsubscribeUrl = email
    ? `${baseUrl}/api/email/unsubscribe?email=${encodeURIComponent(email)}`
    : "#";

  const weekStart = resolveWeekStart(dailyPnL);
  const weekDays = buildWeekDays(weekStart, dailyPnL);
  const weekPnL = weekDays.reduce((sum, day) => sum + (day.pnl ?? 0), 0);

  const totalTrades = winLossStats.wins + winLossStats.losses;
  const winRate =
    totalTrades === 0
      ? 0
      : Math.round((winLossStats.wins / totalTrades) * 100);

  const weekRange = formatWeekRange(weekStart, t.months);
  const weekLabel = t.weekOf(weekRange);

  const labelStyle: React.CSSProperties = {
    fontFamily: FONT,
    fontSize: "13px",
    lineHeight: "18px",
    color: "#687168",
    fontWeight: 600,
    letterSpacing: "0.01em",
    marginTop: 0,
    marginRight: 0,
    marginBottom: "8px",
    marginLeft: 0,
  };

  const bodyStyle: React.CSSProperties = {
    fontFamily: FONT,
    fontSize: "15px",
    lineHeight: "24px",
    color: "#5f665f",
    marginTop: 0,
    marginRight: 0,
    marginBottom: "16px",
    marginLeft: 0,
  };

  return (
    <Html lang={locale}>
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style dangerouslySetInnerHTML={{ __html: zenoChromeCss }} />
      </Head>
      <Preview>{t.preview}</Preview>
      {/* Zeno chrome shell — tables only, matching PR439 broadcasts */}
      <body
        className="dm-bg"
        style={{
          marginTop: 0,
          marginRight: 0,
          marginBottom: 0,
          marginLeft: 0,
          backgroundColor: "#ffffff",
          fontFamily: FONT,
        }}
      >
        <table
          className="dm-bg"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          role="presentation"
          bgcolor="#ffffff"
        >
          <tbody>
            <tr>
              <td
                className="dm-bg"
                align="center"
                bgcolor="#ffffff"
                style={{
                  backgroundColor: "#ffffff",
                  paddingTop: "24px",
                  paddingRight: "8px",
                  paddingBottom: "24px",
                  paddingLeft: "8px",
                }}
              >
                <table
                  className="dm-bg"
                  width="680"
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  role="presentation"
                  bgcolor="#ffffff"
                  style={{
                    width: "100%",
                    maxWidth: "680px",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          paddingTop: "38px",
                          paddingRight: "12px",
                          paddingBottom: "40px",
                          paddingLeft: "12px",
                        }}
                      >
                        {/* Header: mark + wordmark | week label */}
                        <table
                          width="100%"
                          cellPadding={0}
                          cellSpacing={0}
                          border={0}
                          role="presentation"
                        >
                          <tbody>
                            <tr>
                              <td
                                valign="middle"
                                align="left"
                                style={{
                                  paddingTop: 0,
                                  paddingRight: 0,
                                  paddingBottom: "28px",
                                  paddingLeft: 0,
                                }}
                              >
                                <table
                                  cellPadding={0}
                                  cellSpacing={0}
                                  border={0}
                                  role="presentation"
                                >
                                  <tbody>
                                    <tr>
                                      <td
                                        valign="middle"
                                        style={{
                                          paddingTop: 0,
                                          paddingRight: "8px",
                                          paddingBottom: 0,
                                          paddingLeft: 0,
                                        }}
                                      >
                                        <img
                                          className="brand-mark-light dm-image"
                                          src="https://www.deltalytix.app/brand/deltalytix-mark.png"
                                          width={22}
                                          height={22}
                                          border={0}
                                          alt="Deltalytix"
                                          style={{
                                            display: "inline-block",
                                            width: "22px",
                                            height: "22px",
                                            border: 0,
                                            outline: "none",
                                            textDecoration: "none",
                                          }}
                                        />
                                        <img
                                          className="brand-mark-dark dm-image"
                                          src="https://www.deltalytix.app/brand/deltalytix-mark-light.png"
                                          width={22}
                                          height={22}
                                          border={0}
                                          alt="Deltalytix"
                                          style={{
                                            display: "none",
                                            width: "22px",
                                            height: "22px",
                                            border: 0,
                                            outline: "none",
                                            textDecoration: "none",
                                          }}
                                        />
                                      </td>
                                      <td
                                        valign="middle"
                                        style={{
                                          paddingTop: 0,
                                          paddingRight: 0,
                                          paddingBottom: 0,
                                          paddingLeft: 0,
                                        }}
                                      >
                                        <p
                                          className="dm-heading"
                                          style={{
                                            fontFamily: FONT,
                                            fontSize: "15px",
                                            lineHeight: "20px",
                                            color: "#1e231e",
                                            fontWeight: 700,
                                            marginTop: 0,
                                            marginRight: 0,
                                            marginBottom: 0,
                                            marginLeft: 0,
                                          }}
                                        >
                                          Deltalytix
                                        </p>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                              <td
                                valign="middle"
                                align="right"
                                style={{
                                  paddingTop: 0,
                                  paddingRight: 0,
                                  paddingBottom: "28px",
                                  paddingLeft: 0,
                                }}
                              >
                                <p
                                  className="dm-text"
                                  style={{
                                    fontFamily: FONT,
                                    fontSize: "13px",
                                    lineHeight: "20px",
                                    color: "#8a908a",
                                    fontWeight: 400,
                                    marginTop: 0,
                                    marginRight: 0,
                                    marginBottom: 0,
                                    marginLeft: 0,
                                  }}
                                >
                                  {weekLabel}
                                </p>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* 9OS-0 content slot */}
                        <p className="dm-text" style={bodyStyle}>
                          {`${t.greeting} ${firstName},`}
                        </p>
                        <p
                          className="dm-text"
                          style={{
                            ...bodyStyle,
                            fontSize: "13px",
                            lineHeight: "18px",
                            color: "#8a908a",
                            marginBottom: "24px",
                          }}
                        >
                          {t.disclaimer}
                        </p>

                        <p className="dm-text" style={labelStyle}>
                          {t.netPnL}
                        </p>
                        <h1
                          className="dm-heading"
                          style={{
                            fontFamily: FONT,
                            fontSize: "36px",
                            lineHeight: "39px",
                            color: pnlColor(weekPnL),
                            fontWeight: 400,
                            letterSpacing: "-0.045em",
                            marginTop: 0,
                            marginRight: 0,
                            marginBottom: "16px",
                            marginLeft: 0,
                            fontVariantNumeric: "tabular-nums",
                            WebkitFontFeatureSettings: '"tnum"',
                            fontFeatureSettings: '"tnum"',
                          }}
                        >
                          {formatSignedEuro(weekPnL)}
                        </h1>

                        <p className="dm-text" style={bodyStyle}>
                          {resultAnalysisIntro}
                        </p>

                        <Spacer height={16} />

                        <p className="dm-text" style={labelStyle}>
                          {t.daily}
                        </p>
                        <table
                          width="100%"
                          cellPadding={0}
                          cellSpacing={0}
                          border={0}
                          role="presentation"
                          style={{ width: "100%", borderCollapse: "collapse" }}
                        >
                          <tbody>
                            {weekDays.map((day, index) => {
                              const isFirst = index === 0;
                              return (
                                <tr key={dateKey(day.date)}>
                                  <td
                                    className="dm-border"
                                    style={{
                                      paddingTop: "12px",
                                      paddingBottom: "12px",
                                      borderTop: isFirst
                                        ? `1px solid ${colors.listBorder}`
                                        : "none",
                                      borderBottom: `1px solid ${colors.listBorder}`,
                                      verticalAlign: "middle",
                                    }}
                                  >
                                    <span
                                      className="dm-text"
                                      style={{
                                        fontFamily: FONT,
                                        fontSize: "15px",
                                        lineHeight: "24px",
                                        color: "#5f665f",
                                      }}
                                    >
                                      {t.weekdays[index]}
                                    </span>
                                    <span
                                      className="dm-text"
                                      style={{
                                        fontFamily: FONT,
                                        fontSize: "15px",
                                        lineHeight: "24px",
                                        color: "#5f665f",
                                        marginLeft: "8px",
                                      }}
                                    >
                                      {formatDayMonth(day.date, t.months)}
                                    </span>
                                  </td>
                                  <td
                                    className="dm-border"
                                    align="right"
                                    style={{
                                      paddingTop: "12px",
                                      paddingBottom: "12px",
                                      borderTop: isFirst
                                        ? `1px solid ${colors.listBorder}`
                                        : "none",
                                      borderBottom: `1px solid ${colors.listBorder}`,
                                      verticalAlign: "middle",
                                      textAlign: "right",
                                      color:
                                        day.pnl === null
                                          ? "#8a908a"
                                          : pnlColor(day.pnl),
                                      fontFamily: FONT,
                                      fontSize: "15px",
                                      fontWeight: day.pnl === null ? 400 : 600,
                                      lineHeight: "24px",
                                      fontVariantNumeric: "tabular-nums",
                                      WebkitFontFeatureSettings: '"tnum"',
                                      fontFeatureSettings: '"tnum"',
                                    }}
                                  >
                                    {day.pnl === null
                                      ? "—"
                                      : formatSignedEuro(day.pnl)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        <Spacer height={28} />

                        <p className="dm-text" style={labelStyle}>
                          {t.winsAndLosses}
                        </p>
                        <table
                          width="100%"
                          cellPadding={0}
                          cellSpacing={0}
                          border={0}
                          role="presentation"
                          style={{ width: "100%", borderCollapse: "collapse" }}
                        >
                          <tbody>
                            {(
                              [
                                {
                                  label: t.wins,
                                  value: String(winLossStats.wins),
                                  color: colors.positive,
                                },
                                {
                                  label: t.losses,
                                  value: String(winLossStats.losses),
                                  color: colors.negative,
                                },
                                {
                                  label: t.winRate,
                                  value: `${winRate}%`,
                                  color: colors.ink,
                                },
                              ] as const
                            ).map((row) => (
                              <tr key={row.label}>
                                <td
                                  className="dm-border"
                                  style={{
                                    paddingTop: "12px",
                                    paddingBottom: "12px",
                                    borderBottom: `1px solid ${colors.listBorder}`,
                                    fontFamily: FONT,
                                    fontSize: "15px",
                                    lineHeight: "24px",
                                    color: "#5f665f",
                                  }}
                                >
                                  {row.label}
                                </td>
                                <td
                                  className="dm-border"
                                  align="right"
                                  style={{
                                    paddingTop: "12px",
                                    paddingBottom: "12px",
                                    borderBottom: `1px solid ${colors.listBorder}`,
                                    textAlign: "right",
                                    color: row.color,
                                    fontFamily: FONT,
                                    fontSize: "15px",
                                    fontWeight: 600,
                                    lineHeight: "24px",
                                    fontVariantNumeric: "tabular-nums",
                                    WebkitFontFeatureSettings: '"tnum"',
                                    fontFeatureSettings: '"tnum"',
                                  }}
                                >
                                  {row.value}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <Spacer height={28} />

                        <p className="dm-text" style={bodyStyle}>
                          {tipsForNextWeek}
                        </p>

                        {/* Soft green CTA panel — Zeno dm-surface-green */}
                        <table
                          className="dm-surface-green"
                          width="100%"
                          cellPadding={0}
                          cellSpacing={0}
                          border={0}
                          role="presentation"
                          bgcolor="#EFF5EC"
                          style={{
                            backgroundColor: "#EFF5EC",
                            borderRadius: "12px",
                          }}
                        >
                          <tbody>
                            <tr>
                              <td
                                className="dm-surface-green"
                                bgcolor="#EFF5EC"
                                style={{
                                  backgroundColor: "#EFF5EC",
                                  paddingTop: "24px",
                                  paddingRight: "18px",
                                  paddingBottom: "24px",
                                  paddingLeft: "18px",
                                }}
                              >
                                <table
                                  cellPadding={0}
                                  cellSpacing={0}
                                  border={0}
                                  role="presentation"
                                >
                                  <tbody>
                                    <tr>
                                      <td
                                        className="dm-button"
                                        bgcolor="#222722"
                                        style={{
                                          backgroundColor: "#222722",
                                          borderRadius: "6px",
                                          paddingTop: "13px",
                                          paddingRight: "18px",
                                          paddingBottom: "13px",
                                          paddingLeft: "18px",
                                        }}
                                      >
                                        <a
                                          className="dm-button-link"
                                          href={bookCallUrl}
                                          style={{
                                            fontFamily: FONT,
                                            fontSize: "14px",
                                            lineHeight: "20px",
                                            color: "#ffffff",
                                            fontWeight: 700,
                                            textDecoration: "none",
                                          }}
                                        >
                                          {t.bookCall}
                                        </a>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                                <p
                                  className="dm-text"
                                  style={{
                                    fontFamily: FONT,
                                    fontSize: "14px",
                                    lineHeight: "22px",
                                    color: "#5f665f",
                                    marginTop: "16px",
                                    marginRight: 0,
                                    marginBottom: 0,
                                    marginLeft: 0,
                                  }}
                                >
                                  <a
                                    className="dm-text"
                                    href={dashboardUrl}
                                    style={{
                                      fontFamily: FONT,
                                      fontSize: "14px",
                                      lineHeight: "22px",
                                      color: "#3E7550",
                                      fontWeight: 600,
                                      textDecoration: "underline",
                                    }}
                                  >
                                    {t.visitDashboard}
                                  </a>
                                </p>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <p
                          className="dm-text"
                          style={{
                            fontFamily: FONT,
                            fontSize: "12px",
                            lineHeight: "19px",
                            color: "#8a908a",
                            marginTop: "12px",
                            marginRight: 0,
                            marginBottom: 0,
                            marginLeft: 0,
                          }}
                        >
                          {t.callDisclaimer}
                        </p>

                        <p
                          className="dm-heading"
                          style={{
                            fontFamily: FONT,
                            fontSize: "15px",
                            lineHeight: "24px",
                            color: "#1e231e",
                            marginTop: "32px",
                            marginRight: 0,
                            marginBottom: 0,
                            marginLeft: 0,
                          }}
                        >
                          Hugo Demenez
                          <br />
                          <span
                            className="dm-text"
                            style={{
                              fontFamily: FONT,
                              fontSize: "13px",
                              lineHeight: "20px",
                              color: "#5f665f",
                            }}
                          >
                            {t.founder}
                          </span>
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td
                        className="dm-border"
                        style={{
                          borderTopWidth: "1px",
                          borderTopStyle: "solid",
                          borderTopColor: "#e6e8e4",
                          paddingTop: "24px",
                          paddingRight: "12px",
                          paddingBottom: "30px",
                          paddingLeft: "12px",
                        }}
                      >
                        <p
                          className="dm-text"
                          style={{
                            fontFamily: FONT,
                            fontSize: "13px",
                            lineHeight: "20px",
                            color: "#777e77",
                            fontWeight: 700,
                            marginTop: 0,
                            marginRight: 0,
                            marginBottom: "6px",
                            marginLeft: 0,
                          }}
                        >
                          Deltalytix
                        </p>
                        <p
                          className="dm-text"
                          style={{
                            fontFamily: FONT,
                            fontSize: "12px",
                            lineHeight: "19px",
                            color: "#8a908a",
                            marginTop: 0,
                            marginRight: 0,
                            marginBottom: "8px",
                            marginLeft: 0,
                          }}
                        >
                          {t.optedIn}
                        </p>
                        <p
                          className="dm-text"
                          style={{
                            fontFamily: FONT,
                            fontSize: "12px",
                            lineHeight: "19px",
                            color: "#7d837d",
                            marginTop: 0,
                            marginRight: 0,
                            marginBottom: 0,
                            marginLeft: 0,
                          }}
                        >
                          <a
                            className="dm-text"
                            href={unsubscribeUrl}
                            style={{
                              fontFamily: FONT,
                              fontSize: "12px",
                              lineHeight: "19px",
                              color: "#697069",
                              textDecoration: "underline",
                            }}
                          >
                            {t.unsubscribe}
                          </a>
                          {" · "}
                          <a
                            className="dm-text"
                            href={privacyUrl}
                            style={{
                              fontFamily: FONT,
                              fontSize: "12px",
                              lineHeight: "19px",
                              color: "#697069",
                              textDecoration: "underline",
                            }}
                          >
                            {t.privacy}
                          </a>
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </Html>
  );
}
