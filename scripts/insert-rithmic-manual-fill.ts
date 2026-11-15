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
 */
import { prisma } from '../lib/prisma'
import {
  insertManualRithmicProtocolFill,
  parseManualFillCliArgs,
} from '../lib/rithmic-protocol/manual-fill'

async function main() {
  const parsed = parseManualFillCliArgs(process.argv.slice(2))
  if (!parsed.ok) {
    process.stderr.write(`${JSON.stringify({ ok: false, errors: parsed.errors })}\n`)
    process.exitCode = 1
    return
  }
  const result = await insertManualRithmicProtocolFill(parsed.input)
  if (result.ok) {
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
