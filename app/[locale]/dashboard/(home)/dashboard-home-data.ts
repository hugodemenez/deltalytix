import { cacheLife, cacheTag, updateTag } from 'next/cache'
import type { Widget } from '@/app/[locale]/dashboard/types/dashboard'
import { defaultLayouts } from '@/lib/default-layouts'
import type { DashboardLayout } from '@/prisma/generated/prisma/client'
import { getUserId } from '@/server/auth'
import { getDashboardLayout } from '@/server/user-data'
import type { DashboardLayoutWithWidgets } from '@/store/user-store'

export function dashboardHomeCacheTag(userId: string) {
  return `dashboard-home-${userId}`
}

function parseWidgetList(value: unknown): Widget[] {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      return Array.isArray(parsed) ? (parsed as Widget[]) : []
    } catch {
      return []
    }
  }
  return Array.isArray(value) ? (value as Widget[]) : []
}

/**
 * Normalize Prisma JSON layout into the client store shape.
 * Dates become ISO strings so the payload stays RSC/cache-safe.
 */
export function normalizeDashboardLayout(
  layout: DashboardLayout | null
): DashboardLayoutWithWidgets {
  if (!layout) {
    return {
      ...defaultLayouts,
      createdAt: defaultLayouts.createdAt,
      updatedAt: defaultLayouts.updatedAt,
    }
  }

  return {
    id: layout.id,
    userId: layout.userId,
    desktop: parseWidgetList(layout.desktop),
    mobile: parseWidgetList(layout.mobile),
    createdAt: layout.createdAt,
    updatedAt: layout.updatedAt,
  }
}

export async function loadDashboardHomeDataForUser(
  userId: string
): Promise<DashboardLayoutWithWidgets> {
  const layout = await getDashboardLayout(userId)
  return normalizeDashboardLayout(layout)
}

/**
 * Per-user cached dashboard seed (widget layout).
 * `userId` is part of the cache key — cookies stay out of `"use cache"`.
 */
export async function getCachedDashboardHomeData(
  userId: string
): Promise<DashboardLayoutWithWidgets> {
  'use cache'
  cacheTag(dashboardHomeCacheTag(userId))
  cacheLife('minutes')
  return loadDashboardHomeDataForUser(userId)
}

export async function invalidateDashboardHomeCache(userId?: string) {
  const id = userId ?? (await getUserId())
  if (!id) return
  try {
    updateTag(dashboardHomeCacheTag(id))
  } catch {
    // updateTag is only valid in some server contexts; ignore elsewhere
  }
}
