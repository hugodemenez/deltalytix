"use client"

import { useEffect, useState, type ComponentType, type ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Load a client module after hydration via `import()`.
 *
 * Do not use `next/dynamic` here: with Cache Components / PPR it registers a
 * resumable slot. A production `next start` resume mismatch
 * (`Couldn't find all resumable slots…`) plus that slot is what took down the
 * tab when Mindset mounted TipTap.
 */
export function ClientOnlyLazy<P extends object>({
  load,
  fallback,
  ...props
}: {
  load: () => Promise<ComponentType<P>>
  fallback?: ReactNode
} & P) {
  const [Comp, setComp] = useState<ComponentType<P> | null>(null)

  useEffect(() => {
    let cancelled = false
    load()
      .then((Loaded) => {
        if (!cancelled) {
          setComp(() => Loaded)
        }
      })
      .catch((error) => {
        console.error("Failed to load client-only module", error)
      })
    return () => {
      cancelled = true
    }
  }, [load])

  if (!Comp) {
    return (
      fallback ?? (
        <Skeleton className="h-full min-h-[12rem] w-full rounded-lg" />
      )
    )
  }

  return <Comp {...(props as P)} />
}
