import fs from 'fs'
import path from 'path'

const __filename = new URL(import.meta.url).pathname
const __dirname = path.dirname(__filename)

const appDir = path.join(__dirname, '../app')
const outputFilePath = path.join(__dirname, '../public/routes.json')

// Directories to skip entirely
const SKIP_DIRS = new Set(['api', 'admin', 'components', 'utils', 'styles'])

function normalizeSegment(segment: string): string {
  // Remove route group parentheses: (landing) -> empty string (skip in URL)
  if (segment.startsWith('(') && segment.endsWith(')')) {
    return '' // Route groups don't appear in URLs
  }
  return segment
}

function collectRoutes(dir: string, relativeParts: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const routes: string[] = []

  // Skip unwanted directories
  const currentName = path.basename(dir)
  if (SKIP_DIRS.has(currentName)) return routes

  const hasPage = entries.some(e => e.isFile() && e.name === 'page.tsx')

  if (hasPage) {
    const normalized = relativeParts
      .map(normalizeSegment)
      .filter(Boolean) // Remove empty strings from route groups
    const routePath = '/' + normalized.join('/')
    routes.push(routePath === '/' ? '/' : routePath)
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      routes.push(
        ...collectRoutes(path.join(dir, entry.name), [...relativeParts, entry.name])
      )
    }
  }

  return routes
}

const routes = Array.from(new Set(collectRoutes(appDir))).sort()

fs.mkdirSync(path.dirname(outputFilePath), { recursive: true })
fs.writeFileSync(outputFilePath, JSON.stringify(routes, null, 2))

console.log(`Generated ${routes.length} routes`)