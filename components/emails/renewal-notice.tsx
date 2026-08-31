import * as React from "react";
import { Head, Html, Preview } from "@react-email/components";
import {
  buildRenewalCalendar,
  buildRenewalNoticeCopy,
  resolveRenewalCalendarDates,
  type RenewalCalendarDay,
} from "@/lib/renewal-notice-copy";

export interface RenewalNoticeEmailProps {
  userFirstName: string;
  userEmail: string;
  accountName: string;
  propFirmName: string;
  nextPaymentDate: string | Date;
  daysUntilRenewal: number;
  paymentFrequency: string;
  language?: string;
  unsubscribeUrl?: string;
  changeReminderUrl?: string;
  turnOffNoticeUrl?: string;
  now?: string | Date;
}

const FONT = "Geist,Arial,Helvetica,sans-serif";
const PAGE = "#F7F7F4";
const INK = "#222722";
const MUTED = "#5f665f";
const KICKER = "#8a908a";
const MINT = "#EFF5EC";
const WASH = "#E3EDE4";
const HAIRLINE = "#e6e8e4";

const chromeCss = `
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media only screen and (max-width: 620px) {
  .email-shell, .email-pad {
    width: 100% !important;
    max-width: 100% !important;
  }
  .renewal-h1 {
    font-size: 28px !important;
    line-height: 34px !important;
  }
  .meta-label, .meta-value {
    display: block !important;
    width: 100% !important;
    text-align: left !important;
  }
  .meta-value {
    padding-top: 2px !important;
    padding-bottom: 14px !important;
  }
  .cta-primary, .cta-quiet {
    display: block !important;
    width: 100% !important;
  }
  .cta-primary {
    padding-bottom: 12px !important;
    white-space: normal !important;
  }
  .cta-quiet {
    padding-left: 0 !important;
    padding-top: 4px !important;
  }
  .cta-button {
    width: 100% !important;
  }
  .cta-button td {
    width: 100% !important;
  }
  .cta-button-link {
    width: 100% !important;
    display: block !important;
    text-align: center !important;
    box-sizing: border-box !important;
  }
}
@media (prefers-color-scheme: dark) {
  .dm-bg { background-color:#111411 !important; }
  .dm-heading { color:#f3f6f2 !important; }
  .dm-text { color:#b8c1b8 !important; }
  .dm-kicker { color:#8ab89a !important; }
  .dm-surface-green { background-color:#19231b !important; }
  .dm-wash { background-color:#243328 !important; }
  .dm-border { border-color:#343b34 !important; }
  .dm-button { background-color:#edf2ec !important; }
  .dm-button-link { color:#151915 !important; }
  .dm-today { background-color:#edf2ec !important; color:#151915 !important; }
  .dm-payment { border-color:#edf2ec !important; color:#f3f6f2 !important; }
}
[data-ogsc] .dm-bg { background-color:#111411 !important; }
[data-ogsc] .dm-heading { color:#f3f6f2 !important; }
[data-ogsc] .dm-text { color:#b8c1b8 !important; }
[data-ogsc] .dm-kicker { color:#8ab89a !important; }
[data-ogsc] .dm-surface-green { background-color:#19231b !important; }
[data-ogsc] .dm-wash { background-color:#243328 !important; }
[data-ogsc] .dm-border { border-color:#343b34 !important; }
[data-ogsc] .dm-button { background-color:#edf2ec !important; }
[data-ogsc] .dm-button-link { color:#151915 !important; }
[data-ogsc] .dm-today { background-color:#edf2ec !important; color:#151915 !important; }
[data-ogsc] .dm-payment { border-color:#edf2ec !important; color:#f3f6f2 !important; }
img.brand-mark-dark { display: none !important; max-height: 0 !important; overflow: hidden !important; }
@media (prefers-color-scheme: dark) {
  img.brand-mark-light { display: none !important; max-height: 0 !important; overflow: hidden !important; }
  img.brand-mark-dark { display: inline-block !important; max-height: none !important; overflow: visible !important; width: 22px !important; height: 22px !important; }
}
[data-ogsc] img.brand-mark-light { display: none !important; max-height: 0 !important; overflow: hidden !important; }
[data-ogsc] img.brand-mark-dark { display: inline-block !important; max-height: none !important; overflow: visible !important; width: 22px !important; height: 22px !important; }
`;

function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://www.deltalytix.app").replace(
    /\/$/,
    "",
  );
}

function Spacer({ height }: { height: number }) {
  return (
    <table width="100%" cellPadding={0} cellSpacing={0} border={0} role="presentation">
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

function BrandMark() {
  return (
    <>
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
    </>
  );
}

function DayCell({ cell }: { cell: RenewalCalendarDay }) {
  const isToday = cell.kind === "today";
  const isPayment = cell.kind === "payment";
  const isRange = cell.kind === "range";
  const className = [
    "day-cell",
    isToday ? "day-today" : "",
    isPayment ? "day-payment" : "",
    isRange ? "day-range" : "",
    cell.kind === "empty" ? "day-empty" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const number = cell.day == null ? "" : String(cell.day);

  return (
    <td
      className={`${className}${isRange ? " dm-wash" : ""}`}
      align="center"
      valign="middle"
      width="14%"
      bgcolor={isRange ? WASH : undefined}
      style={{
        width: "14.28%",
        height: "36px",
        paddingTop: "4px",
        paddingRight: "2px",
        paddingBottom: "4px",
        paddingLeft: "2px",
        backgroundColor: isRange ? WASH : "transparent",
        fontFamily: FONT,
        fontSize: "13px",
        lineHeight: "20px",
        color: INK,
        textAlign: "center",
      }}
    >
      {isToday ? (
        <span
          className="dm-today"
          style={{
            display: "inline-block",
            width: "28px",
            height: "28px",
            lineHeight: "28px",
            backgroundColor: INK,
            color: "#ffffff",
            borderRadius: "50%",
            fontWeight: 600,
            fontFamily: FONT,
            fontSize: "13px",
          }}
        >
          {number}
        </span>
      ) : isPayment ? (
        <span
          className="dm-payment"
          style={{
            display: "inline-block",
            width: "26px",
            height: "26px",
            lineHeight: "24px",
            border: `1.5px solid ${INK}`,
            borderRadius: "50%",
            color: INK,
            fontWeight: 500,
            fontFamily: FONT,
            fontSize: "13px",
          }}
        >
          {number}
        </span>
      ) : (
        <span
          className="dm-heading"
          style={{
            display: "inline-block",
            minWidth: "28px",
            fontFamily: FONT,
            fontSize: "13px",
            lineHeight: "28px",
            color: INK,
          }}
        >
          {number || "\u00a0"}
        </span>
      )}
    </td>
  );
}

export default function RenewalNoticeEmail({
  userFirstName,
  accountName,
  propFirmName,
  nextPaymentDate,
  daysUntilRenewal,
  language = "en",
  unsubscribeUrl,
  changeReminderUrl,
  turnOffNoticeUrl,
  now,
}: RenewalNoticeEmailProps) {
  const t = buildRenewalNoticeCopy({
    language,
    firstName: userFirstName,
    propFirmName,
    daysUntilRenewal,
  });
  const { today, payment } = resolveRenewalCalendarDates({
    now,
    nextPaymentDate,
    daysUntilRenewal,
  });
  const calendar = buildRenewalCalendar({
    language: t.locale,
    today,
    payment,
  });
  const origin = appOrigin();
  const reminderUrl = changeReminderUrl || `${origin}/dashboard`;
  const disableUrl = turnOffNoticeUrl || `${origin}/dashboard`;
  const unsubUrl = unsubscribeUrl || `${origin}/settings/notifications`;

  return (
    <Html lang={t.locale}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="x-apple-disable-message-reformatting" />
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style dangerouslySetInnerHTML={{ __html: chromeCss }} />
      </Head>
      <Preview>{t.preview}</Preview>
      <body
        className="dm-bg"
        style={{
          marginTop: 0,
          marginRight: 0,
          marginBottom: 0,
          marginLeft: 0,
          backgroundColor: PAGE,
          fontFamily: FONT,
        }}
      >
        <table
          className="dm-bg email-shell"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          role="presentation"
          bgcolor={PAGE}
          style={{ width: "100%", maxWidth: "100%", backgroundColor: PAGE }}
        >
          <tbody>
            <tr>
              <td className="dm-bg" align="center" style={{ padding: 0 }} bgcolor={PAGE}>
                <table
                  className="dm-bg"
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  role="presentation"
                  style={{ width: "100%", maxWidth: "100%" }}
                >
                  <tbody>
                    <tr>
                      <td
                        className="email-pad"
                        style={{
                          paddingTop: "36px",
                          paddingRight: "12px",
                          paddingBottom: "40px",
                          paddingLeft: "12px",
                        }}
                      >
                        <table
                          width="100%"
                          cellPadding={0}
                          cellSpacing={0}
                          border={0}
                          role="presentation"
                        >
                          <tbody>
                            <tr>
                              <td valign="middle" align="left" style={{ paddingBottom: "28px" }}>
                                <table
                                  cellPadding={0}
                                  cellSpacing={0}
                                  border={0}
                                  role="presentation"
                                >
                                  <tbody>
                                    <tr>
                                      <td valign="middle" style={{ paddingRight: "8px" }}>
                                        <BrandMark />
                                      </td>
                                      <td valign="middle">
                                        <p
                                          className="dm-heading"
                                          style={{
                                            fontFamily: FONT,
                                            fontSize: "15px",
                                            lineHeight: "20px",
                                            color: INK,
                                            fontWeight: 700,
                                            margin: 0,
                                          }}
                                        >
                                          Deltalytix
                                        </p>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                              <td valign="middle" align="right" style={{ paddingBottom: "28px" }}>
                                <p
                                  className="dm-kicker dm-text"
                                  style={{
                                    fontFamily: FONT,
                                    fontSize: "13px",
                                    lineHeight: "20px",
                                    color: KICKER,
                                    fontWeight: 400,
                                    margin: 0,
                                  }}
                                >
                                  {t.kicker}
                                </p>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <p
                          className="dm-text"
                          style={{
                            fontFamily: FONT,
                            fontSize: "15px",
                            lineHeight: "24px",
                            color: MUTED,
                            marginTop: 0,
                            marginBottom: "10px",
                          }}
                        >
                          {t.greeting}
                        </p>
                        <h1
                          className="dm-heading renewal-h1"
                          style={{
                            fontFamily: FONT,
                            fontSize: "32px",
                            lineHeight: "40px",
                            fontWeight: 500,
                            letterSpacing: "-0.03em",
                            color: INK,
                            marginTop: 0,
                            marginBottom: "10px",
                          }}
                        >
                          {t.h1}
                        </h1>
                        <p
                          className="dm-text"
                          style={{
                            fontFamily: FONT,
                            fontSize: "15px",
                            lineHeight: "24px",
                            color: MUTED,
                            marginTop: 0,
                            marginBottom: 0,
                          }}
                        >
                          {t.lede}
                        </p>

                        <Spacer height={24} />

                        <table
                          className="dm-surface-green"
                          width="100%"
                          cellPadding={0}
                          cellSpacing={0}
                          border={0}
                          role="presentation"
                          bgcolor={MINT}
                          style={{
                            width: "100%",
                            backgroundColor: MINT,
                            borderRadius: "12px",
                          }}
                        >
                          <tbody>
                            <tr>
                              <td
                                className="dm-surface-green"
                                bgcolor={MINT}
                                style={{
                                  backgroundColor: MINT,
                                  borderRadius: "12px",
                                  paddingTop: "22px",
                                  paddingRight: "22px",
                                  paddingBottom: "22px",
                                  paddingLeft: "22px",
                                }}
                              >
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
                                        className="meta-label dm-text"
                                        valign="top"
                                        style={{
                                          fontFamily: FONT,
                                          fontSize: "13px",
                                          lineHeight: "20px",
                                          color: MUTED,
                                          paddingBottom: "10px",
                                        }}
                                      >
                                        {t.firmLabel}
                                      </td>
                                      <td
                                        className="meta-value dm-heading"
                                        valign="top"
                                        align="right"
                                        style={{
                                          fontFamily: FONT,
                                          fontSize: "15px",
                                          lineHeight: "20px",
                                          color: INK,
                                          fontWeight: 700,
                                          textAlign: "right",
                                          paddingBottom: "10px",
                                        }}
                                      >
                                        {propFirmName}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td
                                        className="meta-label dm-text"
                                        valign="top"
                                        style={{
                                          fontFamily: FONT,
                                          fontSize: "13px",
                                          lineHeight: "20px",
                                          color: MUTED,
                                          paddingBottom: "18px",
                                        }}
                                      >
                                        {t.accountLabel}
                                      </td>
                                      <td
                                        className="meta-value dm-heading"
                                        valign="top"
                                        align="right"
                                        style={{
                                          fontFamily: FONT,
                                          fontSize: "15px",
                                          lineHeight: "20px",
                                          color: INK,
                                          fontWeight: 700,
                                          textAlign: "right",
                                          paddingBottom: "18px",
                                        }}
                                      >
                                        {accountName}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>

                                <p
                                  className="dm-heading"
                                  style={{
                                    fontFamily: FONT,
                                    fontSize: "13px",
                                    lineHeight: "20px",
                                    color: INK,
                                    fontWeight: 600,
                                    marginTop: 0,
                                    marginBottom: "10px",
                                  }}
                                >
                                  {calendar.monthName}
                                </p>

                                <table
                                  width="100%"
                                  cellPadding={0}
                                  cellSpacing={0}
                                  border={0}
                                  role="presentation"
                                >
                                  <tbody>
                                    <tr>
                                      {calendar.weekdays.map((weekday, index) => (
                                        <td
                                          key={`${weekday}-${index}`}
                                          align="center"
                                          width="14%"
                                          style={{
                                            width: "14.28%",
                                            fontFamily: FONT,
                                            fontSize: "12px",
                                            lineHeight: "18px",
                                            color: KICKER,
                                            paddingBottom: "6px",
                                          }}
                                        >
                                          {weekday}
                                        </td>
                                      ))}
                                    </tr>
                                    {calendar.weeks.map((week, weekIndex) => (
                                      <tr key={`week-${weekIndex}`}>
                                        {week.map((cell, dayIndex) => (
                                          <DayCell
                                            key={`d-${weekIndex}-${dayIndex}`}
                                            cell={cell}
                                          />
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>

                                <p
                                  className="dm-text"
                                  style={{
                                    fontFamily: FONT,
                                    fontSize: "13px",
                                    lineHeight: "20px",
                                    color: MUTED,
                                    marginTop: "14px",
                                    marginBottom: 0,
                                  }}
                                >
                                  {t.caption}
                                </p>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <Spacer height={24} />

                        <p
                          className="dm-text"
                          style={{
                            fontFamily: FONT,
                            fontSize: "15px",
                            lineHeight: "24px",
                            color: MUTED,
                            marginTop: 0,
                            marginBottom: 0,
                          }}
                        >
                          {t.quiet}
                        </p>

                        <Spacer height={22} />

                        <table
                          className="cta-row"
                          width="100%"
                          cellPadding={0}
                          cellSpacing={0}
                          border={0}
                          role="presentation"
                        >
                          <tbody>
                            <tr>
                              <td
                                className="cta-primary"
                                valign="middle"
                                width="1%"
                                style={{ width: "1%", whiteSpace: "nowrap" }}
                              >
                                <table
                                  className="cta-button dm-button"
                                  cellPadding={0}
                                  cellSpacing={0}
                                  border={0}
                                  role="presentation"
                                  style={{ borderRadius: "6px" }}
                                >
                                  <tbody>
                                    <tr>
                                      <td
                                        className="dm-button"
                                        align="center"
                                        bgcolor={INK}
                                        style={{
                                          backgroundColor: INK,
                                          borderRadius: "6px",
                                        }}
                                      >
                                        <a
                                          className="cta-button-link dm-button-link"
                                          href={reminderUrl}
                                          style={{
                                            display: "inline-block",
                                            fontFamily: FONT,
                                            fontSize: "14px",
                                            lineHeight: "20px",
                                            fontWeight: 700,
                                            color: "#ffffff",
                                            textDecoration: "none",
                                            paddingTop: "12px",
                                            paddingRight: "18px",
                                            paddingBottom: "12px",
                                            paddingLeft: "18px",
                                            borderRadius: "6px",
                                          }}
                                        >
                                          {t.ctaPrimary}
                                        </a>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                              <td
                                className="cta-quiet"
                                valign="middle"
                                style={{ paddingLeft: "16px" }}
                              >
                                <a
                                  className="dm-text"
                                  href={disableUrl}
                                  style={{
                                    fontFamily: FONT,
                                    fontSize: "14px",
                                    lineHeight: "20px",
                                    color: MUTED,
                                    textDecoration: "none",
                                  }}
                                >
                                  {t.ctaQuiet}
                                </a>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <Spacer height={48} />

                        <p
                          className="dm-heading"
                          style={{
                            fontFamily: FONT,
                            fontSize: "15px",
                            lineHeight: "24px",
                            color: INK,
                            marginTop: 0,
                            marginBottom: 0,
                          }}
                        >
                          {t.signoffName}
                        </p>
                        <p
                          className="dm-text"
                          style={{
                            fontFamily: FONT,
                            fontSize: "13px",
                            lineHeight: "20px",
                            color: MUTED,
                            marginTop: 0,
                            marginBottom: "16px",
                          }}
                        >
                          {t.signoffBrand}
                        </p>
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
                                className="dm-border"
                                height={1}
                                style={{
                                  borderTop: `1px solid ${HAIRLINE}`,
                                  fontSize: "1px",
                                  lineHeight: "1px",
                                }}
                              >
                                &nbsp;
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <p
                          className="dm-text"
                          style={{
                            fontFamily: FONT,
                            fontSize: "13px",
                            lineHeight: "20px",
                            color: KICKER,
                            marginTop: "16px",
                            marginBottom: 0,
                          }}
                        >
                          <a
                            className="dm-text"
                            href={unsubUrl}
                            style={{
                              fontFamily: FONT,
                              fontSize: "13px",
                              lineHeight: "20px",
                              color: KICKER,
                              textDecoration: "none",
                            }}
                          >
                            {t.unsubscribe}
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

RenewalNoticeEmail.PreviewProps = {
  userFirstName: "Hugo",
  userEmail: "hugo@example.com",
  accountName: "LOCAL-SIM-001",
  propFirmName: "Apex",
  nextPaymentDate: "2026-09-12",
  daysUntilRenewal: 7,
  paymentFrequency: "monthly",
  language: "en",
  unsubscribeUrl: "https://www.deltalytix.app/settings/notifications",
  now: "2026-09-05",
} satisfies RenewalNoticeEmailProps;
