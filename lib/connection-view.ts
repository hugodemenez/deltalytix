import type { Connection } from '@/prisma/generated/prisma/client'

/**
 * Client-facing connection shape.
 * `accountId` is kept as an alias of `externalId` (broker login / OAuth key)
 * so existing sync UIs and API bodies stay compatible during the rename.
 */
export type ConnectionView = Omit<Connection, 'externalId'> & {
  externalId: string
  accountId: string
}

export function toConnectionView(
  connection: Connection | (Connection & { accounts?: unknown })
): ConnectionView {
  const { externalId, ...rest } = connection
  return {
    ...rest,
    externalId,
    accountId: externalId,
  }
}

export function toConnectionViews(
  connections: Connection[]
): ConnectionView[] {
  return connections.map(toConnectionView)
}

/** Resolve externalId from request body that may send accountId or externalId */
export function resolveExternalId(body: {
  accountId?: string
  externalId?: string
}): string | undefined {
  return body.externalId || body.accountId
}
