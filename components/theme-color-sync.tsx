"use client";

import { useEffect, useState } from "react";
import {
  observeDocumentThemeColor,
  type CanvasTheme,
} from "@/lib/canvas-theme-color";

/**
 * Always-mounted iOS Safari chrome sync. ThemeProvider can hydrate after
 * the first toggle; this listener is on the document from the root layout
 * and remounts the top-edge sampler when `html` class changes.
 */
export function ThemeColorSync() {
  const [samplerTheme, setSamplerTheme] = useState<CanvasTheme>("light");

  useEffect(() => {
    return observeDocumentThemeColor((theme) => {
      setSamplerTheme(theme);
    });
  }, []);

  return (
    <span
      key={`safari-theme-top-${samplerTheme}`}
      className="safari-theme-sampler"
      aria-hidden="true"
    />
  );
}
