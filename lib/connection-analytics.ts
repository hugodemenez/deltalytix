import posthog, { DisplaySurveyType } from "posthog-js";

/** PostHog survey: Beta connection flow feedback */
export const CONNECTION_FEEDBACK_SURVEY_ID =
  "019f7215-397f-0000-90b4-c32b914ff31e";

const BETA_CONNECTION_FLOW_INVITE_FLAG = "beta-connection-flow-invite";
const SURVEY_SHOWN_STORAGE_KEY = `deltalytix:survey:${CONNECTION_FEEDBACK_SURVEY_ID}:programmatic-shown`;

let surveyDisplayInFlight = false;

function canCapture() {
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return false;
  if (typeof window === "undefined") return false;
  return !posthog.has_opted_out_capturing();
}

function wasProgrammaticSurveyShown() {
  try {
    return localStorage.getItem(SURVEY_SHOWN_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markProgrammaticSurveyShown() {
  try {
    localStorage.setItem(SURVEY_SHOWN_STORAGE_KEY, "1");
  } catch {
    // Ignore storage failures; PostHog "once" schedule is still a backstop.
  }
}

function displayConnectionFeedbackSurvey() {
  if (surveyDisplayInFlight || wasProgrammaticSurveyShown()) return;
  if (posthog.isFeatureEnabled(BETA_CONNECTION_FLOW_INVITE_FLAG) !== true) return;

  surveyDisplayInFlight = true;
  try {
    posthog.displaySurvey(CONNECTION_FEEDBACK_SURVEY_ID, {
      displayType: DisplaySurveyType.Popover,
      // Event-trigger conditions are unreliable on OAuth remounts; we already
      // gated on the invite flag and a successful connection_created capture.
      ignoreConditions: true,
      ignoreDelay: true,
    });
    markProgrammaticSurveyShown();
  } catch (error) {
    surveyDisplayInFlight = false;
    console.warn("[connection-analytics] displaySurvey failed", error);
  }
}

/**
 * Event-triggered PostHog surveys often miss OAuth return flows: the page
 * remounts, `connection_created` fires within a few seconds, and the surveys
 * extension may not have registered its event listeners yet.
 *
 * Display the feedback survey programmatically after a successful connect,
 * gated by the same invite flag.
 */
export function showConnectionFeedbackSurvey() {
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return;
  if (typeof window === "undefined") return;
  if (wasProgrammaticSurveyShown()) return;

  const tryShow = () => {
    if (surveyDisplayInFlight || wasProgrammaticSurveyShown()) return;
    if (posthog.isFeatureEnabled(BETA_CONNECTION_FLOW_INVITE_FLAG) !== true) return;

    posthog.getSurveys((surveys) => {
      if (surveyDisplayInFlight || wasProgrammaticSurveyShown()) return;
      if (!surveys?.some((survey) => survey.id === CONNECTION_FEEDBACK_SURVEY_ID)) {
        // Force reload once if the survey list is still empty/stale.
        posthog.getSurveys((reloaded) => {
          if (reloaded?.some((survey) => survey.id === CONNECTION_FEEDBACK_SURVEY_ID)) {
            displayConnectionFeedbackSurvey();
          }
        }, true);
        return;
      }
      displayConnectionFeedbackSurvey();
    }, true);
  };

  // Flags + surveys both load async after OAuth remount.
  const unsubscribe = posthog.onFeatureFlags(() => {
    tryShow();
  });
  tryShow();
  window.setTimeout(tryShow, 1500);
  window.setTimeout(() => {
    tryShow();
    unsubscribe?.();
  }, 4000);
}

export function captureConnectionAddClicked(service: string) {
  if (!canCapture()) return;
  posthog.capture("connection_add_clicked", {
    service,
    source: "connections_page",
  });
}

export function captureConnectionCreated(
  service: string,
  extra?: Record<string, string | boolean | number | null | undefined>
) {
  // Always attempt the feedback survey after a successful connect.
  // Analytics capture is optional (beta is a separate origin/consent jar).
  if (canCapture()) {
    posthog.capture("connection_created", {
      service,
      source: "connections_page",
      ...extra,
    });
  }
  showConnectionFeedbackSurvey();
}
