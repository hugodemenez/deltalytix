"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/locales/client";

/**
 * Legacy Tradovate OAuth redirect target.
 * Forwards code/state to Connections, which owns the callback UI.
 */
export default function ImportCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useI18n();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    // Drop stale result markers from older callback handlers
    if (!params.has("code")) {
      router.replace("/dashboard/connections");
      return;
    }
    router.replace(`/dashboard/connections?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[calc(100vh-var(--navbar-height,4rem))] items-center justify-center bg-[oklch(0.97_0_0)] text-[oklch(0.17_0_0)] dark:bg-[oklch(0.17_0_0)] dark:text-[oklch(0.93_0_0)]">
      <div className="flex flex-col items-center gap-3 text-sm text-black/55 dark:text-white/55">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p>{t("tradovateSync.callback.processing")}</p>
      </div>
    </div>
  );
}
