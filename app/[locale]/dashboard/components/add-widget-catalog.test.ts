import { describe, expect, it } from 'bun:test'
import type { Layouts, Widget, WidgetType } from '../types/dashboard'
import {
  omitPlacedWidgets,
  placedTypesForViewport,
  placedWidgetTypes,
} from './add-widget-catalog'

function widget(type: WidgetType, i = type): Widget {
  return { i, type, size: 'tiny', x: 0, y: 0, w: 3, h: 1 }
}

const catalog: { type: WidgetType }[] = [
  { type: 'calendarWidget' },
  { type: 'equityChart' },
  { type: 'tradeTableReview' },
  { type: 'cumulativePnl' },
]

describe('placedWidgetTypes', () => {
  it('collects unique types from the current layout', () => {
    expect(
      placedWidgetTypes([
        widget('calendarWidget'),
        widget('equityChart'),
        widget('calendarWidget', 'dup'),
      ])
    ).toEqual(new Set<WidgetType>(['calendarWidget', 'equityChart']))
  })

  it('is empty when the layout is missing', () => {
    expect(placedWidgetTypes(undefined).size).toBe(0)
  })
})

describe('placedTypesForViewport', () => {
  const layouts: Layouts = {
    desktop: [widget('calendarWidget'), widget('equityChart')],
    mobile: [widget('cumulativePnl')],
  }

  it('reads desktop types off the mobile breakpoint', () => {
    expect(placedTypesForViewport(layouts, false)).toEqual(
      new Set<WidgetType>(['calendarWidget', 'equityChart'])
    )
  })

  it('reads mobile types on the mobile breakpoint', () => {
    expect(placedTypesForViewport(layouts, true)).toEqual(
      new Set<WidgetType>(['cumulativePnl'])
    )
  })
})

describe('omitPlacedWidgets', () => {
  it('drops types already on the board and keeps the rest', () => {
    expect(
      omitPlacedWidgets(catalog, ['calendarWidget', 'equityChart']).map(
        (item) => item.type
      )
    ).toEqual(['tradeTableReview', 'cumulativePnl'])
  })

  it('returns the full catalog when nothing is placed', () => {
    expect(omitPlacedWidgets(catalog, []).map((item) => item.type)).toEqual(
      catalog.map((item) => item.type)
    )
  })

  it('returns an empty list when every type is already placed', () => {
    expect(
      omitPlacedWidgets(catalog, catalog.map((item) => item.type))
    ).toEqual([])
  })
})
