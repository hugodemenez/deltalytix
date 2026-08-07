/**
 * Minimal XML reader for IBKR Flex Web Service responses.
 *
 * Flex responses are a narrow, well-defined shape: a shallow element tree whose
 * payload lives entirely in attributes (`<Trade symbol="MESZ5" quantity="2" .../>`),
 * plus a handful of text-only status elements. That is small enough to read
 * directly, which keeps a brokerage-data path free of a general-purpose XML
 * dependency.
 *
 * Deliberately NOT a general XML parser: no namespaces, no mixed content, no
 * DTD/entity expansion (so no billion-laughs surface). Unknown constructs are
 * skipped rather than guessed at.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
}

/** Decodes the XML entities IBKR actually emits, plus numeric character refs. */
export function decodeXmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const codePoint = Number.parseInt(entity.slice(2), 16)
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint)
    }
    if (entity.startsWith('#')) {
      const codePoint = Number.parseInt(entity.slice(1), 10)
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint)
    }
    return NAMED_ENTITIES[entity] ?? match
  })
}

/** Strips comments and CDATA so they can never be mistaken for markup. */
function stripNonMarkup(xml: string): string {
  return xml.replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
}

/**
 * Reads the attributes of an element's opening tag, starting just past the
 * element name. Returns the attribute map and the index right after the tag.
 *
 * Quote-aware, so a `>` inside an attribute value does not end the tag early.
 */
function readAttributes(
  xml: string,
  startIndex: number,
): { attributes: Record<string, string>; endIndex: number } | null {
  const attributes: Record<string, string> = {}
  let i = startIndex

  while (i < xml.length) {
    const char = xml[i]

    if (char === '>') {
      return { attributes, endIndex: i + 1 }
    }
    if (char === '/' && xml[i + 1] === '>') {
      return { attributes, endIndex: i + 2 }
    }
    if (/\s/.test(char)) {
      i += 1
      continue
    }

    // attribute name
    const nameStart = i
    while (i < xml.length && !/[\s=/>]/.test(xml[i])) i += 1
    const name = xml.slice(nameStart, i)
    if (!name) return null

    while (i < xml.length && /\s/.test(xml[i])) i += 1

    // Valueless attribute — not emitted by Flex, but skip it rather than break.
    if (xml[i] !== '=') {
      attributes[name] = ''
      continue
    }
    i += 1
    while (i < xml.length && /\s/.test(xml[i])) i += 1

    const quote = xml[i]
    if (quote !== '"' && quote !== "'") return null
    i += 1
    const valueStart = i
    while (i < xml.length && xml[i] !== quote) i += 1
    if (i >= xml.length) return null

    attributes[name] = decodeXmlEntities(xml.slice(valueStart, i))
    i += 1
  }

  return null
}

/**
 * Returns the attribute map of every `<tagName ...>` element in the document,
 * in document order. Both self-closing and paired elements are matched; only
 * the opening tag's attributes are read.
 */
export function extractElements(xml: string, tagName: string): Record<string, string>[] {
  const source = stripNonMarkup(xml)
  const results: Record<string, string>[] = []
  // `<Trade` must not also match `<TradeConfirm`, hence the delimiter check.
  const opening = new RegExp(`<${tagName}(?=[\\s/>])`, 'g')

  let match: RegExpExecArray | null
  while ((match = opening.exec(source)) !== null) {
    const parsed = readAttributes(source, match.index + tagName.length + 1)
    if (parsed) {
      results.push(parsed.attributes)
      opening.lastIndex = parsed.endIndex
    }
  }

  return results
}

/**
 * Returns the trimmed text content of the first `<tagName>text</tagName>`,
 * or null when the element is absent or empty.
 */
export function extractText(xml: string, tagName: string): string | null {
  const source = stripNonMarkup(xml)
  const pattern = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagName}>`)
  const match = source.match(pattern)
  if (!match) return null
  const text = decodeXmlEntities(match[1]).trim()
  return text.length > 0 ? text : null
}
