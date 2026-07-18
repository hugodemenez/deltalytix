import posthog from "posthog-js";

/** Fired once per tab session after cumulative visible time on Connections reaches the threshold. */
export const CONNECTIONS_PAGE_DWELL_THRESHOLD_EVENT =
  "connections_page_dwell_threshold";

const DWELL_STORAGE_KEY = "deltalytix:connections-page-dwell-ms";
const DWELL_EVENT_FIRED_KEY = "deltalytix:connections-page-dwell-event-fired";
const DWELL_THRESHOLD_MS = 180_000;
const CONSENT_EVENT = "deltalytix:analytics-consent";

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

function wasDwellEventFired(): boolean {
  try {
    return sessionStorage.getItem(DWELL_EVENT_FIRED_KEY) === "1";
  } catch {
    return false;
  }
}

function markDwellEventFired() {
  try {
    sessionStorage.setItem(DWELL_EVENT_FIRED_KEY, "1");
  } catch {
    // sessionStorage may be unavailable
  }
}

function captureDwellThreshold(totalMs: number) {
  if (wasDwellEventFired()) return;
  if (!canCapture()) return;

  markDwellEventFired();
  posthog.capture(CONNECTIONS_PAGE_DWELL_THRESHOLD_EVENT, {
    source: "connections_page",
    dwell_ms: Math.floor(totalMs),
    threshold_ms: DWELL_THRESHOLD_MS,
  });
}

/**
 * Accumulates visible time on the Connections page in sessionStorage so OAuth
 * leave/return does not reset progress. Fires
 * {@link CONNECTIONS_PAGE_DWELL_THRESHOLD_EVENT} once the tab has spent
 * {@link DWELL_THRESHOLD_MS} visible milliseconds on the page.
 */
export function startConnectionsPageDwellTracking(): () => void {
  if (typeof window === "undefined") return () => {};

  let segmentStart: number | null =
    document.visibilityState === "visible" ? Date.now() : null;
  let stopped = false;
  let pendingFireTimer: number | null = null;

  const accumulate = (endSegment = false) => {
    if (segmentStart == null) return readDwellMs();
    const now = Date.now();
    const elapsed = now - segmentStart;
    segmentStart = endSegment || stopped ? null : now;
    const total = readDwellMs() + Math.max(0, elapsed);
    writeDwellMs(total);
    return total;
  };

  const maybeFire = (opts?: { defer?: boolean }) => {
    const total = accumulate();
    if (total < DWELL_THRESHOLD_MS) return;
    if (wasDwellEventFired()) return;

    if (opts?.defer) {
      // After OAuth remount, give PostHog surveys time to attach event listeners.
      if (pendingFireTimer != null) return;
      pendingFireTimer = window.setTimeout(() => {
        pendingFireTimer = null;
        captureDwellThreshold(readDwellMs());
      }, 1500);
      return;
    }

    captureDwellThreshold(total);
  };

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      segmentStart = Date.now();
      maybeFire({ defer: readDwellMs() >= DWELL_THRESHOLD_MS });
    } else {
      accumulate(true);
    }
  };

  const onConsent = () => {
    maybeFire({ defer: true });
  };

  const onPageHide = () => {
    accumulate(true);
  };

  const intervalId = window.setInterval(() => {
    if (document.visibilityState !== "visible" || stopped) return;
    maybeFire();
  }, 1000);

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener(CONSENT_EVENT, onConsent);

  // Resume from prior segments in this tab (e.g. after OAuth return).
  maybeFire({ defer: readDwellMs() >= DWELL_THRESHOLD_MS });

  return () => {
    stopped = true;
    accumulate(true);
    if (pendingFireTimer != null) {
      window.clearTimeout(pendingFireTimer);
      pendingFireTimer = null;
    }
    window.clearInterval(intervalId);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener(CONSENT_EVENT, onConsent);
  };
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
