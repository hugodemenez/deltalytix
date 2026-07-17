"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, X } from "lucide-react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/locales/client";

export const BETA_CONNECTION_FLOW_INVITE_FLAG = "beta-connection-flow-invite";
const DISMISS_STORAGE_KEY = "deltalytix:beta-connection-flow-invite:dismissed";
const BETA_CONNECTION_URL = "https://beta.deltalytix.app/dashboard/connections";

function isInviteHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host === "deltalytix.app" ||
    host === "www.deltalytix.app" ||
    host === "localhost" ||
    host === "127.0.0.1"
  );
}

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, "1");
  } catch {
    // Ignore storage failures; invite can still be closed for this session.
  }
}

export function BetaConnectionFlowInvite() {
  const t = useI18n();
  const [isVisible, setIsVisible] = useState(false);
  const hasTrackedShown = useRef(false);

  const hide = useCallback(() => {
    setIsVisible(false);
  }, []);

  const dismiss = useCallback(() => {
    markDismissed();
    hide();
    if (!posthog.has_opted_out_capturing()) {
      posthog.capture("beta_connection_flow_invite_dismissed", {
        flag: BETA_CONNECTION_FLOW_INVITE_FLAG,
      });
    }
  }, [hide]);

  const accept = useCallback(() => {
    markDismissed();
    hide();
    if (!posthog.has_opted_out_capturing()) {
      posthog.capture("beta_connection_flow_invite_clicked", {
        flag: BETA_CONNECTION_FLOW_INVITE_FLAG,
        destination: BETA_CONNECTION_URL,
      });
    }
    window.open(BETA_CONNECTION_URL, "_blank", "noopener,noreferrer");
  }, [hide]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return;
    if (!isInviteHost() || wasDismissed()) return;

    const syncVisibility = () => {
      if (wasDismissed()) {
        setIsVisible(false);
        return;
      }

      const enabled = posthog.isFeatureEnabled(BETA_CONNECTION_FLOW_INVITE_FLAG) === true;
      setIsVisible(enabled);

      if (enabled && !hasTrackedShown.current && !posthog.has_opted_out_capturing()) {
        hasTrackedShown.current = true;
        posthog.capture("beta_connection_flow_invite_shown", {
          flag: BETA_CONNECTION_FLOW_INVITE_FLAG,
        });
      }
    };

    syncVisibility();
    return posthog.onFeatureFlags(syncVisibility);
  }, []);

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.aside
          aria-label={t("betaInvite.connectionFlow.ariaLabel")}
          className="fixed bottom-4 right-4 z-50 w-[min(100vw-2rem,22rem)] rounded-lg border border-border bg-background/95 p-4 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/90"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-snug">
                {t("betaInvite.connectionFlow.title")}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("betaInvite.connectionFlow.description")}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground"
              onClick={dismiss}
              aria-label={t("betaInvite.connectionFlow.dismiss")}
            >
              <X />
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button type="button" size="sm" onClick={accept}>
              {t("betaInvite.connectionFlow.tryBeta")}
              <ExternalLink />
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
              {t("betaInvite.connectionFlow.notNow")}
            </Button>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
