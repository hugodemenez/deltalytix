const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const ANALYTICS_CONSENT_COOKIE = "deltalytix_analytics_consent";

function getSharedAnalyticsConsent() {
  try {
    const cookie = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${ANALYTICS_CONSENT_COOKIE}=`));

    if (!cookie) return null;

    const value = cookie.split("=")[1];
    if (value === "granted") return true;
    if (value === "denied") return false;
    return null;
  } catch {
    return null;
  }
}

function hasAnalyticsConsent() {
  const sharedConsent = getSharedAnalyticsConsent();
  if (sharedConsent !== null) return sharedConsent;

  try {
    const storedConsent = localStorage.getItem("cookieConsent");
    if (!storedConsent) return false;

    return JSON.parse(storedConsent).analytics_storage === true;
  } catch {
    return false;
  }
}

/** App shells need PostHog sooner (flags / identity). Marketing can wait. */
function isAppShellPath(pathname: string) {
  return (
    pathname.includes("/dashboard") ||
    pathname.includes("/connections") ||
    pathname.includes("/authentication") ||
    pathname.includes("/admin") ||
    pathname.includes("/billing")
  );
}

function scheduleDeferred(task: () => void, idleTimeoutMs: number) {
  const run = () => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => task(), { timeout: idleTimeoutMs });
      return;
    }
    window.setTimeout(task, Math.min(idleTimeoutMs, 2500));
  };

  if (document.readyState === "complete") {
    run();
    return;
  }

  window.addEventListener("load", run, { once: true });
}

async function initPostHog(options?: { marketing?: boolean }) {
  const { default: posthog } = await import("posthog-js");

  if (posthog.__loaded) return posthog;

  const marketing = options?.marketing ?? false;

  posthog.init(projectToken!, {
    api_host: apiHost,
    defaults: "2026-05-30",
    person_profiles: "identified_only",
    opt_out_capturing_by_default: !hasAnalyticsConsent(),
    opt_out_capturing_persistence_type: "localStorage",
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: true,
    disable_session_recording: true,
    // Marketing: skip external surveys script + flag bootstrap on the critical path.
    disable_external_dependency_loading: marketing,
    advanced_disable_feature_flags: marketing,
  });

  return posthog;
}

if (projectToken && typeof window !== "undefined") {
  const appShell = isAppShellPath(window.location.pathname);

  if (appShell) {
    // Still avoid competing with hydration: load after the window load event.
    scheduleDeferred(() => {
      void initPostHog({ marketing: false });
    }, 1500);
  } else {
    // Marketing: wait for idle so LCP/TBT are not blocked by ~200KB+ of analytics JS.
    scheduleDeferred(() => {
      void initPostHog({ marketing: true });
    }, 5000);
  }
}
