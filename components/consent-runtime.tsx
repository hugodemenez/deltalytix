"use client";

import { useEffect } from "react";

import {
  reconcileStoredConsent,
  resetConsentDecision,
} from "@/lib/consent-persist";

export function ConsentRuntime() {
  useEffect(() => {
    reconcileStoredConsent();

    const handleKeyPress = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === "K") {
        resetConsentDecision();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  return null;
}
