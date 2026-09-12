/**
 * Weekly recap LLM blurb: week-shape metadata + FR/EN prompts.
 *
 * Production callers pass only the recap week's daily PnL (Mon–Sun UTC).
 * The model must not invent a multi-day ramp from a single session —
 * Sep 6 2026 1-day weeks (Gregoire, Corentin) failed that way.
 */

export const WEEKLY_ANALYSIS_MODEL =
  process.env.WEEKLY_ANALYSIS_MODEL ?? "openai/gpt-5.6-luna"

/** Cursor "Luna High" = GPT-5.6 Luna with high reasoning via AI Gateway. */
export const WEEKLY_ANALYSIS_REASONING_EFFORT = "high" as const

export type DailyPnL = {
  date: Date
  pnl: number
}

export type WeekShapeKind = "empty" | "single-day" | "flat" | "varied"

export type WeekShapeSummary = {
  tradingDayCount: number
  kind: WeekShapeKind
  /** Day-to-day / shape language only when ≥2 days with meaningful PnL spread. */
  allowShapeLanguage: boolean
}

const MEANINGFUL_PNL_SPREAD = 0.01

const DELTALYTIX_CONTEXT = {
  fr: `Deltalytix est une plateforme web pour day traders de futures, avec une interface intuitive et personnalisable. Conçue à partir de mon expérience personnelle en tant que day trader de futures, utilisant des stratégies de scalping, elle propose des fonctionnalités comme la gestion de multiple compte, le suivi des challenges propfirms, et des tableaux de bord personnalisables. Notre but est de fournir aux traders des analyses approfondies sur leurs habitudes de trading pour optimiser leurs stratégies et améliorer leur prise de décision.`,
  en: `Deltalytix is a web platform for futures day traders, featuring an intuitive and customizable interface. Designed from my personal experience as a futures day trader using scalping strategies, it offers features like multiple account management, propfirm challenge tracking, and customizable dashboards. Our goal is to provide traders with in-depth analysis of their trading habits to optimize their strategies and improve decision-making.`,
} as const

export function summarizeWeekShape(days: DailyPnL[]): WeekShapeSummary {
  const tradingDayCount = days.length
  if (tradingDayCount === 0) {
    return { tradingDayCount: 0, kind: "empty", allowShapeLanguage: false }
  }
  if (tradingDayCount === 1) {
    return { tradingDayCount: 1, kind: "single-day", allowShapeLanguage: false }
  }

  const pnls = days.map((day) => day.pnl)
  const spread = Math.max(...pnls) - Math.min(...pnls)
  const varied = spread >= MEANINGFUL_PNL_SPREAD
  return {
    tradingDayCount,
    kind: varied ? "varied" : "flat",
    allowShapeLanguage: varied,
  }
}

export function formatDailyPnLForPrompt(
  days: DailyPnL[],
  language: "fr" | "en",
): string {
  const locale = language === "fr" ? "fr-FR" : "en-US"
  if (days.length === 0) {
    return language === "fr"
      ? "(aucune journée avec des données)"
      : "(no days with data)"
  }

  return [...days]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((day) => {
      const label = day.date.toLocaleDateString(locale, {
        weekday: "long",
        day: "2-digit",
        month: "long",
        timeZone: "UTC",
      })
      return `- ${label}: ${day.pnl}€`
    })
    .join("\n")
}

export function formatWeekShapeForPrompt(
  shape: WeekShapeSummary,
  language: "fr" | "en",
): string {
  if (language === "fr") {
    const kindLabel = {
      empty: "aucune donnée",
      "single-day": "un seul jour de trading",
      flat: "plusieurs jours, série plate (peu ou pas de variation)",
      varied: "plusieurs jours avec variation significative",
    }[shape.kind]
    const shapeRule = shape.allowShapeLanguage
      ? "autorisé uniquement si les chiffres du jour le montrent"
      : "interdit — ne pas inventer de rampe, d'escalade, ni de « commencé doucement / monté en puissance »"
    return `Contexte factuel (à respecter, ne pas ignorer) :
- Jours de trading cette semaine : ${shape.tradingDayCount}
- Forme de la série : ${shape.kind} (${kindLabel})
- Langage jour-après-jour / forme de semaine : ${shapeRule}`
  }

  const kindLabel = {
    empty: "no data",
    "single-day": "exactly one trading day",
    flat: "several days, flat series (little or no variation)",
    varied: "several days with meaningful variation",
  }[shape.kind]
  const shapeRule = shape.allowShapeLanguage
    ? "allowed only when the daily numbers support it"
    : 'forbidden — do not invent a ramp, escalation, or "started soft then climbed"'
  return `Factual context (follow this, do not ignore it):
- Trading days this week: ${shape.tradingDayCount}
- Series shape: ${shape.kind} (${kindLabel})
- Day-to-day / week-shape language: ${shapeRule}`
}

export function buildWeeklyAnalysisPrompt(
  days: DailyPnL[],
  language: "fr" | "en",
): string {
  const shape = summarizeWeekShape(days)
  const series = formatDailyPnLForPrompt(days, language)
  const meta = formatWeekShapeForPrompt(shape, language)

  if (language === "fr") {
    return `Tu es un coach en trading. Tu restes concret, amical et honnête sur les chiffres. Tu n'inventes jamais une histoire de semaine.
${DELTALYTIX_CONTEXT.fr}

${meta}

P&L journalier de la semaine du récap (ce sont les seules journées — il n'y a pas de série de la semaine précédente) :
${series}

Pour l'analyse (intro) :
1. Une phrase simple sur la semaine en cours, jusqu'à 60 mots
2. Si la série est single-day (exactement un jour de trading), dis-le clairement (une séance / un jour). Interdit : « commencé doucement », « monté en puissance », ou toute rampe inventée
3. Un langage jour-après-jour ou de forme de semaine uniquement si le contexte factuel l'autorise (≥2 jours avec variation réelle)
4. Pas de fluff motivationnel vague (« énergie positive », « belle dynamique » sans chiffre)
5. Parle comme à un ami, avec des mots simples
6. N'invente ni jours supplémentaires, ni comparaison avec une semaine précédente absente des données
7. Toute affirmation sur un jour plus fort ou plus faible doit correspondre à la liste de P&L

Pour les conseils (tips) :
1. Un conseil simple, jusqu'à 36 mots
2. Si possible, cite un outil Deltalytix utile (tableau de bord, journal, calendrier, filtres, vues de comptes)
3. Sois précis sur l'action à faire la semaine prochaine
4. Reste honnête : un seul jour ne justifie pas un conseil basé sur une « tendance de la semaine »
5. Mots simples, concrets, pas de slogan

Écris une analyse utile et fidèle aux données :`
  }

  return `You are a trading coach. Stay concrete, friendly, and honest about the numbers. Never invent a week-long story.
${DELTALYTIX_CONTEXT.en}

${meta}

Daily P&L for the recap week (these are the only days — there is no previous-week series):
${series}

For the analysis (intro):
1. One simple sentence about the current week, up to 60 words
2. If the series is single-day (exactly one trading day), say that plainly (one session / one day). Forbidden: "started soft", "ramped up", "monté en puissance", or any invented escalation
3. Day-to-day or week-shape language only when the factual context allows it (≥2 days with real variation)
4. No vague motivational fluff ("positive energy", "great momentum" with no number)
5. Speak like a friend, using simple words
6. Do not invent extra days or a previous-week comparison that is not in the data
7. Any claim about a stronger or weaker day must match the P&L list

For the tips:
1. One simple tip, up to 36 words
2. When it fits, name a Deltalytix tool that helps (dashboard, journal, calendar, filters, account views)
3. Be specific about what to do next week
4. Stay honest: one day does not justify advice based on a "week-long trend"
5. Simple, concrete words — no slogans

Write an analysis that is useful and faithful to the data:`
}
