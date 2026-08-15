import type { Layouts, WidgetType } from '../types/dashboard'

export const ADD_WIDGET_CATEGORIES = [
  'other',
  'charts',
  'tables',
  'statistics',
] as const

export type AddWidgetCategory = (typeof ADD_WIDGET_CATEGORIES)[number]

export function placedWidgetTypes(
  widgets: { type: WidgetType }[] | undefined
): Set<WidgetType> {
  return new Set((widgets ?? []).map((widget) => widget.type))
}

/** Same viewport split WidgetCanvas uses for `activeLayout`. */
export function placedTypesForViewport(
  layouts: Layouts,
  isMobile: boolean
): Set<WidgetType> {
  return placedWidgetTypes(isMobile ? layouts.mobile : layouts.desktop)
}

export function omitPlacedWidgets<T extends { type: WidgetType }>(
  widgets: T[],
  placedTypes: Iterable<WidgetType>
): T[] {
  const placed =
    placedTypes instanceof Set ? placedTypes : new Set(placedTypes)
  return widgets.filter((widget) => !placed.has(widget.type))
}
