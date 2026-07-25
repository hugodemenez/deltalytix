"use client";

import Link, { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

function GetStartedLinkContent({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();

  return (
    <span
      className="relative inline-flex items-center justify-center text-sm font-medium"
      aria-busy={pending}
    >
      <span className={pending ? "invisible" : undefined}>{children}</span>
      {pending && (
        <>
          <Loader2 className="absolute h-4 w-4 animate-spin" aria-hidden />
          <span className="sr-only">Loading…</span>
        </>
      )}
    </span>
  );
}

export default function HeroCtaLink({ children }: { children: React.ReactNode }) {
  return (
    <Link
      href={"/dashboard"}
      className="inline-flex h-12 items-center justify-center rounded-sm bg-[oklch(0.22_0.01_95)] px-6 text-sm font-medium text-white transition-[opacity,transform] hover:opacity-85 active:scale-[0.96] dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]"
    >
      <GetStartedLinkContent>{children}</GetStartedLinkContent>
      <span className="ml-3">→</span>
    </Link>
  );
}
