export type RenewalNoticeLocale = "en" | "fr";

export type CivilDate = {
  year: number;
  month: number;
  day: number;
};

export type RenewalCalendarDayKind = "empty" | "plain" | "today" | "payment" | "range";

export type RenewalCalendarDay = {
  day: number | null;
  kind: RenewalCalendarDayKind;
};

export const RENEWAL_WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;

const MONTHS = {
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  fr: [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ],
} as const;

const copy = {
  en: {
    kicker: "Account payment",
    greeting: (firstName: string) => `Hi ${firstName},`,
    h1: (firm: string, days: number) =>
      days === 1 ? `${firm} payment tomorrow.` : `${firm} payment in ${days} days.`,
    lede: "Auto-renew monthly is set at the firm.",
    firmLabel: "Firm",
    accountLabel: "Account",
    caption: (days: number) => (days === 1 ? "1 day left" : `${days} days left`),
    quiet:
      "You can change when we remind you, or turn this notice off for this account.",
    ctaPrimary: "Change reminder",
    ctaQuiet: "Turn off this notice",
    signoffName: "Hugo",
    signoffBrand: "Deltalytix",
    unsubscribe: "Unsubscribe from renewal notifications",
  },
  fr: {
    kicker: "Paiement du compte",
    greeting: (firstName: string) => `Bonjour ${firstName},`,
    h1: (firm: string, days: number) =>
      days === 1
        ? `Paiement ${firm} demain.`
        : `Paiement ${firm} dans ${days} jours.`,
    lede: "Le renouvellement automatique mensuel est réglé auprès de la prop firm.",
    firmLabel: "Prop firm",
    accountLabel: "Compte",
    caption: (days: number) =>
      days === 1 ? "Plus qu'un jour." : `Plus que ${days} jours`,
    quiet:
      "Vous pouvez changer le moment du rappel, ou désactiver cet avis pour ce compte.",
    ctaPrimary: "Modifier le rappel",
    ctaQuiet: "Désactiver cet avis",
    signoffName: "Hugo",
    signoffBrand: "Deltalytix",
    unsubscribe: "Se désabonner des avis de paiement de compte",
  },
} as const;

export function renewalNoticeLocale(language?: string): RenewalNoticeLocale {
  return language === "fr" ? "fr" : "en";
}

export function resolveRenewalNoticeFirstName(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return "Trader";
  }
  if (trimmed.includes("@")) {
    return "Trader";
  }
  return trimmed;
}

export function buildRenewalNoticeCopy(input: {
  language?: string;
  firstName?: string | null;
  propFirmName: string;
  daysUntilRenewal: number;
}) {
  const locale = renewalNoticeLocale(input.language);
  const t = copy[locale];
  const firstName = resolveRenewalNoticeFirstName(input.firstName);
  const firm = input.propFirmName.trim() || (locale === "fr" ? "prop firm" : "firm");
  const days = Number.isFinite(input.daysUntilRenewal)
    ? Math.max(0, Math.round(input.daysUntilRenewal))
    : 0;
  const h1 = t.h1(firm, days);

  return {
    locale,
    firstName,
    kicker: t.kicker,
    greeting: t.greeting(firstName),
    h1,
    preview: h1,
    subject: h1,
    lede: t.lede,
    firmLabel: t.firmLabel,
    accountLabel: t.accountLabel,
    caption: t.caption(days),
    quiet: t.quiet,
    ctaPrimary: t.ctaPrimary,
    ctaQuiet: t.ctaQuiet,
    signoffName: t.signoffName,
    signoffBrand: t.signoffBrand,
    unsubscribe: t.unsubscribe,
  };
}

export function civilToOrdinal(date: CivilDate): number {
  return Date.UTC(date.year, date.month, date.day);
}

export function addCivilDays(date: CivilDate, days: number): CivilDate {
  const next = new Date(date.year, date.month, date.day + days);
  return {
    year: next.getFullYear(),
    month: next.getMonth(),
    day: next.getDate(),
  };
}

export function parseCivilDate(
  value: Date | string | undefined | null,
): CivilDate | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      year: value.getFullYear(),
      month: value.getMonth(),
      day: value.getDate(),
    };
  }

  if (typeof value === "string") {
    const iso = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      return {
        year: Number(iso[1]),
        month: Number(iso[2]) - 1,
        day: Number(iso[3]),
      };
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return {
        year: parsed.getFullYear(),
        month: parsed.getMonth(),
        day: parsed.getDate(),
      };
    }
  }

  return null;
}

export function buildRenewalCalendar(input: {
  language?: string;
  today: CivilDate;
  payment: CivilDate;
}) {
  const locale = renewalNoticeLocale(input.language);
  const { today, payment } = input;
  const daysInMonth = new Date(today.year, today.month + 1, 0).getDate();
  const firstWeekday = new Date(today.year, today.month, 1).getDay();
  const mondayPad = (firstWeekday + 6) % 7;
  const todayOrdinal = civilToOrdinal(today);
  const paymentOrdinal = civilToOrdinal(payment);
  const rangeStart = Math.min(todayOrdinal, paymentOrdinal);
  const rangeEnd = Math.max(todayOrdinal, paymentOrdinal);

  const cells: RenewalCalendarDay[] = [];
  for (let i = 0; i < mondayPad; i += 1) {
    cells.push({ day: null, kind: "empty" });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const cell: CivilDate = { year: today.year, month: today.month, day };
    const ordinal = civilToOrdinal(cell);
    const isToday = ordinal === todayOrdinal;
    const isPayment = ordinal === paymentOrdinal;

    let kind: RenewalCalendarDayKind = "plain";
    if (isToday) {
      kind = "today";
    } else if (isPayment) {
      kind = "payment";
    } else if (ordinal > rangeStart && ordinal < rangeEnd) {
      kind = "range";
    }

    cells.push({ day, kind });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ day: null, kind: "empty" });
  }

  const weeks: RenewalCalendarDay[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return {
    monthName: MONTHS[locale][today.month],
    weekdays: RENEWAL_WEEKDAYS,
    weeks,
  };
}

export function resolveRenewalCalendarDates(input: {
  now?: Date | string;
  nextPaymentDate?: Date | string;
  daysUntilRenewal: number;
}) {
  const today =
    parseCivilDate(input.now) ??
    parseCivilDate(new Date()) ?? {
      year: 2026,
      month: 8,
      day: 1,
    };
  const payment =
    parseCivilDate(input.nextPaymentDate) ??
    addCivilDays(today, input.daysUntilRenewal);

  return { today, payment };
}
