import { WIDGET_REGISTRY } from "@/app/[locale]/dashboard/config/widget-registry"
import { Widget, WidgetSize } from "@/app/[locale]/dashboard/types/dashboard"

export const MOBILE_CAROUSEL_VIEWPORT_HEIGHT =
  "calc(100dvh - var(--navbar-height, 5rem) - var(--tabs-height, 3rem))"

export const MOBILE_CAROUSEL_HEIGHT =
  "calc(100dvh - var(--navbar-height, 5rem) - var(--tabs-height, 3rem) - var(--mobile-toolbar-top, 5.5rem))"

/** Pick the largest allowed size so widgets fill the carousel slide. */
export function getCarouselWidgetSize(
  config: (typeof WIDGET_REGISTRY)[keyof typeof WIDGET_REGISTRY],
  widget: Widget
): WidgetSize {
  if (config.requiresFullWidth) {
    return config.defaultSize
  }
  if (config.allowedSizes.length === 1) {
    return config.allowedSizes[0]
  }

  const preferredOrder: WidgetSize[] = [
    "extra-large",
    "large",
    "medium",
    "small-long",
    "small",
    "tiny",
  ]

  for (const size of preferredOrder) {
    if (config.allowedSizes.includes(size)) {
      return size
    }
  }

  return widget.size as WidgetSize
}
