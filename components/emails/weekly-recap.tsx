import * as React from "react";
import {
  Body,
  Container,
  Font,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

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
    sentBy: "This email was sent to you by Deltalytix",
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
    sentBy: "Cet email vous a été envoyé par Deltalytix",
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

const colors = {
  ink: "#171717",
  muted: "#737373",
  faint: "#A3A3A3",
  hairline: "#E5E5E5",
  canvas: "#F5F5F5",
  white: "#FFFFFF",
  positive: "#16A34A",
  negative: "#DC2626",
} as const;

const fontFamily =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

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
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return `${Math.trunc(abs / 1000)}K`;
  }
  return Math.trunc(abs).toString();
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

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "[REDACTED]").replace(
    /\/$/,
    "",
  );
  const dashboardUrl = `${baseUrl}/dashboard`;
  const unsubscribeUrl = email
    ? `${baseUrl}/api/email/unsubscribe?email=${encodeURIComponent(email)}`
    : "#";
  const bookCallUrl = "https://cal.com/hugo-demenez/deltalytix-discussion";

  const weekStart = resolveWeekStart(dailyPnL);
  const weekDays = buildWeekDays(weekStart, dailyPnL);
  const weekPnL = weekDays.reduce(
    (sum, day) => sum + (day.pnl ?? 0),
    0,
  );

  const totalTrades = winLossStats.wins + winLossStats.losses;
  const winRate =
    totalTrades === 0
      ? 0
      : Math.round((winLossStats.wins / totalTrades) * 100);

  const weekRange = formatWeekRange(weekStart, t.months);

  return (
    <Html lang={locale}>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily={["Helvetica", "Arial", "sans-serif"]}
          webFont={{
            url: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Inter"
          fallbackFontFamily={["Helvetica", "Arial", "sans-serif"]}
          webFont={{
            url: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2",
            format: "woff2",
          }}
          fontWeight={700}
          fontStyle="normal"
        />
      </Head>
      <Preview>{t.preview}</Preview>
      <Body
        style={{
          margin: 0,
          padding: "24px 0",
          backgroundColor: colors.canvas,
          fontFamily,
          color: colors.ink,
        }}
      >
        <Container
          style={{
            width: "100%",
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: colors.white,
          }}
        >
          <Section style={{ padding: "40px 32px 32px" }}>
            {/* Eyebrow */}
            <Text
              style={{
                margin: "0 0 16px",
                color: colors.muted,
                fontSize: "13px",
                lineHeight: "18px",
                fontFamily,
              }}
            >
              {t.weekOf(weekRange)}
            </Text>

            {/* Greeting */}
            <Text
              style={{
                margin: "0 0 8px",
                color: colors.ink,
                fontSize: "28px",
                fontWeight: 700,
                lineHeight: "34px",
                fontFamily,
              }}
            >
              {`${t.greeting} ${firstName},`}
            </Text>

            {/* Disclaimer */}
            <Text
              style={{
                margin: "0 0 28px",
                color: colors.faint,
                fontSize: "12px",
                lineHeight: "18px",
                fontFamily,
              }}
            >
              {t.disclaimer}
            </Text>

            {/* Hero Net P&L */}
            <Text
              style={{
                margin: "0 0 4px",
                color: colors.muted,
                fontSize: "13px",
                lineHeight: "18px",
                fontFamily,
              }}
            >
              {t.netPnL}
            </Text>
            <Text
              style={{
                margin: "0 0 20px",
                color: pnlColor(weekPnL),
                fontSize: "36px",
                fontWeight: 700,
                lineHeight: "42px",
                fontFamily,
                fontVariantNumeric: "tabular-nums",
                WebkitFontFeatureSettings: '"tnum"',
                fontFeatureSettings: '"tnum"',
              }}
            >
              {formatSignedEuro(weekPnL)}
            </Text>

            {/* Summary */}
            <Text
              style={{
                margin: "0 0 32px",
                color: colors.ink,
                fontSize: "15px",
                lineHeight: "24px",
                fontFamily,
              }}
            >
              {resultAnalysisIntro}
            </Text>

            {/* Daily */}
            <Text
              style={{
                margin: "0 0 12px",
                color: colors.ink,
                fontSize: "16px",
                fontWeight: 700,
                lineHeight: "22px",
                fontFamily,
              }}
            >
              {t.daily}
            </Text>
            <table
              role="presentation"
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "32px",
              }}
            >
              <tbody>
                {weekDays.map((day, index) => {
                  const isLast = index === weekDays.length - 1;
                  return (
                    <tr key={dateKey(day.date)}>
                      <td
                        style={{
                          padding: "12px 0",
                          borderBottom: isLast
                            ? "none"
                            : `1px solid ${colors.hairline}`,
                          verticalAlign: "middle",
                        }}
                      >
                        <span
                          style={{
                            color: colors.muted,
                            fontSize: "14px",
                            lineHeight: "20px",
                            fontFamily,
                          }}
                        >
                          {t.weekdays[index]}
                        </span>
                        <span
                          style={{
                            color: colors.faint,
                            fontSize: "14px",
                            lineHeight: "20px",
                            fontFamily,
                            marginLeft: "8px",
                          }}
                        >
                          {formatDayMonth(day.date, t.months)}
                        </span>
                      </td>
                      <td
                        align="right"
                        style={{
                          padding: "12px 0",
                          borderBottom: isLast
                            ? "none"
                            : `1px solid ${colors.hairline}`,
                          verticalAlign: "middle",
                          textAlign: "right",
                          color:
                            day.pnl === null
                              ? colors.faint
                              : pnlColor(day.pnl),
                          fontSize: "14px",
                          fontWeight: day.pnl === null ? 400 : 700,
                          lineHeight: "20px",
                          fontFamily,
                          fontVariantNumeric: "tabular-nums",
                          WebkitFontFeatureSettings: '"tnum"',
                          fontFeatureSettings: '"tnum"',
                        }}
                      >
                        {day.pnl === null ? "—" : formatSignedEuro(day.pnl)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Wins and losses */}
            <Text
              style={{
                margin: "0 0 12px",
                color: colors.ink,
                fontSize: "16px",
                fontWeight: 700,
                lineHeight: "22px",
                fontFamily,
              }}
            >
              {t.winsAndLosses}
            </Text>
            <table
              role="presentation"
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "28px",
              }}
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
                ).map((row, index, rows) => {
                  const isLast = index === rows.length - 1;
                  return (
                    <tr key={row.label}>
                      <td
                        style={{
                          padding: "12px 0",
                          borderBottom: isLast
                            ? "none"
                            : `1px solid ${colors.hairline}`,
                          color: colors.ink,
                          fontSize: "14px",
                          lineHeight: "20px",
                          fontFamily,
                        }}
                      >
                        {row.label}
                      </td>
                      <td
                        align="right"
                        style={{
                          padding: "12px 0",
                          borderBottom: isLast
                            ? "none"
                            : `1px solid ${colors.hairline}`,
                          textAlign: "right",
                          color: row.color,
                          fontSize: "14px",
                          fontWeight: 700,
                          lineHeight: "20px",
                          fontFamily,
                          fontVariantNumeric: "tabular-nums",
                          WebkitFontFeatureSettings: '"tnum"',
                          fontFeatureSettings: '"tnum"',
                        }}
                      >
                        {row.value}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Insights */}
            <Text
              style={{
                margin: "0 0 24px",
                color: colors.ink,
                fontSize: "15px",
                lineHeight: "24px",
                fontFamily,
              }}
            >
              {tipsForNextWeek}
            </Text>

            {/* CTAs */}
            <table
              role="presentation"
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              style={{ width: "100%", borderCollapse: "collapse" }}
            >
              <tbody>
                <tr>
                  <td style={{ width: "50%", paddingRight: "8px" }}>
                    <Link
                      href={bookCallUrl}
                      style={{
                        display: "block",
                        backgroundColor: colors.ink,
                        borderRadius: "4px",
                        color: colors.white,
                        fontSize: "14px",
                        fontWeight: 500,
                        lineHeight: "20px",
                        fontFamily,
                        textAlign: "center",
                        textDecoration: "none",
                        padding: "12px 16px",
                      }}
                    >
                      {t.bookCall}
                    </Link>
                  </td>
                  <td style={{ width: "50%", paddingLeft: "8px" }}>
                    <Link
                      href={dashboardUrl}
                      style={{
                        display: "block",
                        backgroundColor: colors.white,
                        border: `1px solid ${colors.hairline}`,
                        borderRadius: "4px",
                        color: colors.ink,
                        fontSize: "14px",
                        fontWeight: 500,
                        lineHeight: "20px",
                        fontFamily,
                        textAlign: "center",
                        textDecoration: "none",
                        padding: "12px 16px",
                      }}
                    >
                      {t.visitDashboard}
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>

            <Text
              style={{
                margin: "12px 0 0",
                color: colors.faint,
                fontSize: "12px",
                lineHeight: "18px",
                fontFamily,
              }}
            >
              {t.callDisclaimer}
            </Text>

            {/* Signature */}
            <Text
              style={{
                margin: "32px 0 0",
                color: colors.ink,
                fontSize: "14px",
                lineHeight: "22px",
                fontFamily,
              }}
            >
              Hugo Demenez
              <br />
              <span style={{ color: colors.muted }}>{t.founder}</span>
            </Text>

            <Hr
              style={{
                borderColor: colors.hairline,
                borderTop: `1px solid ${colors.hairline}`,
                margin: "28px 0 20px",
              }}
            />

            <Text
              style={{
                margin: 0,
                color: colors.faint,
                fontSize: "12px",
                lineHeight: "18px",
                fontFamily,
                textAlign: "center",
              }}
            >
              {`${t.sentBy} · `}
              <Link
                href={unsubscribeUrl}
                style={{
                  color: colors.faint,
                  textDecoration: "underline",
                }}
              >
                {t.unsubscribe}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
