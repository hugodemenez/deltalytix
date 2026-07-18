import posthog, { DisplaySurveyType } from "posthog-js";

/** PostHog survey: Beta connection flow feedback */
export const CONNECTION_FEEDBACK_SURVEY_ID =
  "019f7215-397f-0000-90b4-c32b914ff31e";

/** Optional analytics breadcrumb when consent allows capture. */
export const CONNECTIONS_PAGE_DWELL_THRESHOLD_EVENT =
  "connections_page_dwell_threshold";

const DWELL_STORAGE_KEY = "deltalytix:connections-page-dwell-ms";
const SURVEY_SHOWN_STORAGE_KEY = `deltalytix:survey:${CONNECTION_FEEDBACK_SURVEY_ID}:programmatic-shown`;
const DWELL_THRESHOLD_MS = 60_000;
const CONSENT_EVENT = "deltalytix:analytics-consent";

let surveyDisplayInFlight = false;

function canCapture() {
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return false;
  if (typeof window === "undefined") return false;
  return !posthog.has_opted_out_capturing();
}

function readDwellMs(): number {
  try {
    const raw = sessionStorage.getItem(DWELL_STORAGE_KEY);
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function writeDwellMs(ms: number) {
  try {
    sessionStorage.setItem(DWELL_STORAGE_KEY, String(Math.floor(ms)));
  } catch {
    // sessionStorage may be unavailable
  }
}

function wasSurveyShown(): boolean {
  try {
    return sessionStorage.getItem(SURVEY_SHOWN_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markSurveyShown() {
  try {
    sessionStorage.setItem(SURVEY_SHOWN_STORAGE_KEY, "1");
  } catch {
    // sessionStorage may be unavailable
  }
}

function captureDwellThreshold(totalMs: number) {
  if (!canCapture()) return;
  posthog.capture(CONNECTIONS_PAGE_DWELL_THRESHOLD_EVENT, {
    source: "connections_page",
    dwell_ms: Math.floor(totalMs),
    threshold_ms: DWELL_THRESHOLD_MS,
  });
}

/**
 * Show the feedback survey directly — do not wait for PostHog event-trigger
 * conditions or analytics consent. Capture remains optional.
 */
function showConnectionFeedbackSurvey(totalMs: number) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return;
  if (typeof window === "undefined") return;
  if (surveyDisplayInFlight || wasSurveyShown()) return;

  surveyDisplayInFlight = true;

  const display = () => {
    if (wasSurveyShown()) return;
    try {
      posthog.displaySurvey(CONNECTION_FEEDBACK_SURVEY_ID, {
        displayType: DisplaySurveyType.Popover,
        ignoreConditions: true,
        ignoreDelay: true,
      });
      markSurveyShown();
      captureDwellThreshold(totalMs);
    } catch (error) {
      surveyDisplayInFlight = false;
      console.warn("[connection-analytics] displaySurvey failed", error);
    }
  };

  try {
    posthog.getSurveys((surveys) => {
      if (wasSurveyShown()) return;
      if (surveys?.some((survey) => survey.id === CONNECTION_FEEDBACK_SURVEY_ID)) {
        display();
        return;
      }
      // Force reload once if surveys extension is still warming up (common on iOS).
      posthog.getSurveys((reloaded) => {
        if (reloaded?.some((survey) => survey.id === CONNECTION_FEEDBACK_SURVEY_ID)) {
          display();
          return;
        }
        surveyDisplayInFlight = false;
      }, true);
    }, true);
  } catch (error) {
    surveyDisplayInFlight = false;
    console.warn("[connection-analytics] getSurveys failed", error);
  }
}

/**
 * Accumulates time on the Connections page in sessionStorage so OAuth
 * leave/return does not reset progress. After {@link DWELL_THRESHOLD_MS},
 * shows the feedback survey programmatically (no event/consent gate).
 */
export function startConnectionsPageDwellTracking(): () => void {
  if (typeof window === "undefined") return () => {};
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return () => {};
  if (wasSurveyShown()) return () => {};

  // Count while mounted. iOS Safari can report odd initial visibilityState;
  // pause only when the page is actually backgrounded/unloaded.
  let segmentStart: number | null = Date.now();
  let stopped = false;
  let pendingShowTimer: number | null = null;
  let intervalId: number | null = null;

  const stopTracking = () => {
    if (stopped) return;
    stopped = true;
    segmentStart = null;
    if (pendingShowTimer != null) {
      window.clearTimeout(pendingShowTimer);
      pendingShowTimer = null;
    }
    if (intervalId != null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener(CONSENT_EVENT, onConsent);
  };

  const accumulate = (endSegment = false) => {
    if (segmentStart == null) return readDwellMs();
    const now = Date.now();
    const elapsed = now - segmentStart;
    segmentStart = endSegment || stopped ? null : now;
    const total = Math.min(
      DWELL_THRESHOLD_MS,
      readDwellMs() + Math.max(0, elapsed)
    );
    writeDwellMs(total);
    return total;
  };

  const maybeShow = (opts?: { defer?: boolean }) => {
    if (stopped || wasSurveyShown()) {
      stopTracking();
      return;
    }

    const total = accumulate();
    if (total < DWELL_THRESHOLD_MS) return;

    const finish = () => {
      showConnectionFeedbackSurvey(readDwellMs());
      if (wasSurveyShown()) {
        stopTracking();
      }
    };

    if (opts?.defer) {
      if (pendingShowTimer != null) return;
      // Give PostHog surveys time to load after remount / consent.
      pendingShowTimer = window.setTimeout(() => {
        pendingShowTimer = null;
        finish();
      }, 1500);
      return;
    }

    finish();
  };

  const onVisibility = () => {
    if (stopped) return;
    if (document.visibilityState === "visible") {
      segmentStart = Date.now();
      maybeShow({ defer: readDwellMs() >= DWELL_THRESHOLD_MS });
    } else {
      accumulate(true);
    }
  };

  const onConsent = () => {
    maybeShow({ defer: true });
  };

  const onPageHide = () => {
    accumulate(true);
  };

  intervalId = window.setInterval(() => {
    if (stopped) return;
    if (document.visibilityState === "hidden") return;
    maybeShow();
  }, 1000);

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener(CONSENT_EVENT, onConsent);

  maybeShow({ defer: readDwellMs() >= DWELL_THRESHOLD_MS });

  return stopTracking;
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
  if (!canCapture()) return;
  posthog.capture("connection_created", {
    service,
    source: "connections_page",
    ...extra,
  });
}
