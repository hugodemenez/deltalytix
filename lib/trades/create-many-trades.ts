/**
 * Largest `Trade.createMany` statement we send. Prod sync/import inserts were
 * single statements up to ~222k characters (~532ms). 500 rows keeps each
 * INSERT small without changing skipDuplicates, row order, or the summed count.
 */
export const TRADE_CREATE_MANY_CHUNK_SIZE = 500

type CreateManyArgs<T> = {
  data: T[]
  skipDuplicates?: boolean
}

/**
 * Insert `data` in order through `createMany`, `chunkSize` rows at a time.
 *
 * The caller owns the transaction. `createMany` is that caller's
 * `prisma.trade.createMany` or `tx.trade.createMany` — this helper does not
 * open its own. A failure in a later chunk rolls back earlier chunks only
 * when the caller already wrapped the call. `saveTradesCore` does not: trade
 * ids are deterministic and `skipDuplicates` makes a committed chunk a no-op
 * on retry.
 *
 * `skipDuplicates` is forwarded on every chunk. When the caller is inside a
 * transaction, a row inserted by an earlier chunk is visible to the next, so
 * duplicates that used to be collapsed by a single `INSERT ... ON CONFLICT DO
 * NOTHING` still collapse. The returned `count` is the sum of the chunk counts.
 * An empty `data` array still performs one `createMany`, matching the
 * previous single-call behavior.
 */
export async function createManyTradesInChunks<T>(
  createMany: (args: CreateManyArgs<T>) => Promise<{ count: number }>,
  args: { data: readonly T[]; skipDuplicates?: boolean },
  chunkSize: number = TRADE_CREATE_MANY_CHUNK_SIZE,
): Promise<{ count: number }> {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new Error(`chunkSize must be a positive integer, received ${chunkSize}`)
  }

  const chunks: T[][] =
    args.data.length === 0
      ? [[]]
      : Array.from({ length: Math.ceil(args.data.length / chunkSize) }, (_, index) =>
          args.data.slice(index * chunkSize, (index + 1) * chunkSize),
        )

  let count = 0
  for (const data of chunks) {
    const result = await createMany(
      args.skipDuplicates === undefined
        ? { data }
        : { data, skipDuplicates: args.skipDuplicates },
    )
    count += result.count
  }
  return { count }
}
