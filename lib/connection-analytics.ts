import posthog from "posthog-js";

function canCapture() {
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return false;
  if (typeof window === "undefined") return false;
  return !posthog.has_opted_out_capturing();
}

export function captureConnectionAddClicked(service: string) {
  if (!canCapture()) return;
  posthog.capture("connection_add_clicked", {
    service,
    source: "connections_page",
  });
}

export function captureConnectionCreated(service: string, extra?: Record<string, string | boolean | number | null | undefined>) {
  if (!canCapture()) return;
  posthog.capture("connection_created", {
    service,
    source: "connections_page",
    ...extra,
  });
}
