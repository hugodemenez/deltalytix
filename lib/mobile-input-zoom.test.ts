import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * iOS Safari zooms the whole page when a focused text field renders below 16px,
 * and it does not zoom back out on blur. Every field the user can type into
 * therefore needs at least `text-base` at mobile widths, typically written as
 * `text-base sm:text-sm` so desktop keeps the denser size.
 *
 * This guard exists because the rule is invisible on a desktop browser: the
 * offending class looks correct until someone opens the page on a phone. It
 * scans source rather than rendered output, which is coarse, but it catches the
 * one mistake that actually recurs — a `text-sm` typed onto a new input.
 */

const ROOTS = ['app', 'components']

/** Elements whose focused font-size drives iOS zoom. Radix `<Select>` renders a
 *  button and native `<select>` is included; both are covered by the regex. */
const FIELD_PATTERN = /<(Input|Textarea|CommandInput|input|textarea|select)\b/
const SMALL_TEXT = /\btext-(xs|sm)\b/
const MOBILE_GUARD = /\btext-(base|lg|xl)\b/

/**
 * Fields that cannot receive typed text, so they never trigger the zoom.
 * Keyed by `path:line` of the opening tag.
 */
const ALLOWED: ReadonlyArray<{ file: string; reason: string }> = [
  {
    file: 'app/[locale]/admin/components/newsletter/newsletter-audio-splitter.tsx',
    reason: 'type="file" — the class styles the picker button, not typed text',
  },
  {
    file: 'app/[locale]/admin/components/newsletter/newsletter-audio-extractor.tsx',
    reason: 'type="file" — the class styles the picker button, not typed text',
  },
]

function collectTsxFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.next')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      collectTsxFiles(full, found)
    } else if (full.endsWith('.tsx')) {
      found.push(full)
    }
  }
  return found
}

/** The opening tag of the element starting on `lines[index]`. */
function readOpeningTag(lines: string[], index: number): string {
  const window = lines.slice(index, index + 14).join('\n')
  const selfClosing = window.indexOf('/>')
  const plain = window.indexOf('>')
  const end = selfClosing !== -1 ? selfClosing : plain
  return end === -1 ? window : window.slice(0, end + 2)
}

function findUnguardedFields(): string[] {
  const offenders: string[] = []
  const allowedFiles = new Set(ALLOWED.map((entry) => entry.file))

  for (const root of ROOTS) {
    for (const file of collectTsxFiles(root)) {
      if (allowedFiles.has(file)) continue

      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, index) => {
        if (!FIELD_PATTERN.test(line)) return
        const tag = readOpeningTag(lines, index)
        if (SMALL_TEXT.test(tag) && !MOBILE_GUARD.test(tag)) {
          offenders.push(`${file}:${index + 1}`)
        }
      })
    }
  }

  return offenders
}

describe('mobile input zoom', () => {
  it('has no text field sized below 16px at mobile widths', () => {
    // A failure here lists the exact tags to fix: add `text-base` and move the
    // small size behind `sm:` (e.g. `text-sm` becomes `text-base sm:text-sm`).
    expect(findUnguardedFields()).toEqual([])
  })
})
