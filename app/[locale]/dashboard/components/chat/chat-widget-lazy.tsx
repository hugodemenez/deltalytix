"use client"

import { ClientOnlyLazy } from "@/components/client-only-lazy"
import { Skeleton } from "@/components/ui/skeleton"
import type { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard"

function loadChatWidget() {
  return import("./chat").then((mod) => mod.default)
}

export default function ChatWidget({ size }: { size?: WidgetSize }) {
  return (
    <ClientOnlyLazy
      load={loadChatWidget}
      fallback={<Skeleton className="h-full min-h-[12rem] w-full rounded-lg" />}
      size={size}
    />
  )
}
