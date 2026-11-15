/**
 * Insert one manual Rithmic Protocol fill.
 *
 * The row patches a gap in Rithmic's own order history. Rebuilds and ordinary
 * sync keep it. Preview is the default; pass `--apply` to write. Repeating
 * the same user, account, symbol, exchange, side, qty, price, and timestamp
 * does not create a second row.
 *
 * The timestamp must fall inside the rebuild window (at or after the Friday
 * 17:00 CT anchor) or it will not change that window's P_0.
 *
 * Preview:
 *   bun scripts/insert-rithmic-manual-fill.ts \
 *     --user-id USER_ID \
 *     --account ACCOUNT_NUMBER \
 *     --symbol MESZ6 \
 *     --exchange CME \
 *     --side buy \
 *     --qty 2 \
 *     --price 5800.25 \
 *     --timestamp 2026-09-25T17:07:00+02:00 \
 *     --note "Rithmic order history omitted this 2-lot MESZ6 buy" \
 *     --dry-run
 *
 * Write: the same arguments with `--apply` instead of `--dry-run`.
 * If the preview warns about a near-miss or a superseding plant fill,
 * `--apply` is refused until `--acknowledge-warnings` is also passed.
 *
 * Retire a blocking manual fill (preview, then write):
 *   bun scripts/insert-rithmic-manual-fill.ts \
 *     --retire \
 *     --user-id USER_ID \
 *     --account ACCOUNT_NUMBER \
 *     --fill-id manual-FILL_ID \
 *     --reason "plant fill arrived; this patch was the wrong clock" \
 *     --apply
 *
 * If the preview lists an annotated trade, move the annotation if you
 * want to keep it, delete the stored row, then run a sync or rebuild.
 * The trade itself is never deleted by this script.
 *
 * Confirm a plant fill is a different execution (preview, then write):
 *   bun scripts/insert-rithmic-manual-fill.ts \
 *     --confirm-distinct \
 *     --user-id USER_ID \
 *     --account ACCOUNT_NUMBER \
 *     --fill-id manual-FILL_ID \
 *     --upstream-fill-id PLANT_FILL_ID \
 *     --reason "next-session fill, not this patch" \
 *     --apply
 *
 * `--apply` is refused when the plant fill is an exact match or unrelated.
 * Re-send with `--acknowledge-exact-match` or `--acknowledge-unrelated`.
 * A split piece is stored as the consolidated order id.
 * If a stored trade on the manual leg or the plant order is annotated,
 * `--apply` also needs `--acknowledge-annotated-trades`.
 */
import { prisma } from '../lib/prisma'
import {
  confirmDistinctManualRithmicProtocolFill,
  insertManualRithmicProtocolFill,
  parseManualFillCliArgs,
  retireManualRithmicProtocolFill,
} from '../lib/rithmic-protocol/manual-fill'

async function main() {
  const parsed = parseManualFillCliArgs(process.argv.slice(2))
  if (!parsed.ok) {
    process.stderr.write(`${JSON.stringify({ ok: false, errors: parsed.errors })}\n`)
    process.exitCode = 1
    return
  }
  const result =
    parsed.command === 'retire'
      ? await retireManualRithmicProtocolFill(parsed.input)
      : parsed.command === 'confirm-distinct'
        ? await confirmDistinctManualRithmicProtocolFill(parsed.input)
        : await insertManualRithmicProtocolFill(parsed.input)
  if (result.ok && 'warnings' in result) {
    for (const warning of result.warnings) {
      process.stderr.write(`[RITHMIC-MANUAL-FILL] warning: ${warning}\n`)
    }
  }
  const stream = result.ok ? process.stdout : process.stderr
  stream.write(`${JSON.stringify(result)}\n`)
  if (!result.ok) process.exitCode = 1
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
