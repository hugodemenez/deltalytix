"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { DesktopNavProps } from "./navbar-desktop-nav-types";

export type { DesktopNavProps };

/**
 * Loads the Radix mega-menu only on large viewports so mobile PageSpeed
 * does not parse/hydrate navigation-menu JS.
 */
export function LazyDesktopNav(props: DesktopNavProps) {
  const [Nav, setNav] = useState<ComponentType<DesktopNavProps> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    let cancelled = false;

    const load = () => {
      if (!mq.matches || cancelled) return;
      void import("./navbar-desktop-nav").then((mod) => {
        if (!cancelled) setNav(() => mod.DesktopNav);
      });
    };

    load();
    mq.addEventListener("change", load);
    return () => {
      cancelled = true;
      mq.removeEventListener("change", load);
    };
  }, []);

  if (!Nav) {
    return <div className="hidden h-10 lg:block" aria-hidden="true" />;
  }

  return <Nav {...props} />;
}
