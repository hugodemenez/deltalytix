"use client"

import { ClientOnlyLazy } from "@/components/client-only-lazy"
import { Skeleton } from "@/components/ui/skeleton"
import type { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard"

function loadMindsetWidget() {
  return import("./mindset-widget").then((mod) => mod.MindsetWidget)
}

export function MindsetWidget({ size }: { size: WidgetSize }) {
  return (
    <ClientOnlyLazy
      load={loadMindsetWidget}
      fallback={<Skeleton className="h-full min-h-[12rem] w-full rounded-lg" />}
      size={size}
    />
  )
}
