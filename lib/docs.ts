import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { cache, type ReactElement } from 'react'
import { compileMdxSource } from '@/lib/mdx'

const DOCS_PATH = path.join(process.cwd(), 'content/docs')

export interface DocMeta {
  title: string
  description: string
  order: number
  slug: string
}

export interface Doc {
  meta: DocMeta
  content: ReactElement
  slug: string
}

type DocMetadataEntry = { meta: DocMeta; slug: string }

function getDocPath(slug: string, locale: string) {
  return path.join(DOCS_PATH, locale, `${slug}.mdx`)
}

function normalizeDocMeta(meta: Record<string, unknown>, slug: string): DocMeta {
  if (typeof meta.order !== 'number') {
    throw new Error(`Doc "${slug}" is missing required frontmatter field "order"`)
  }

  return {
    title: typeof meta.title === 'string' ? meta.title : slug,
    description: typeof meta.description === 'string' ? meta.description : '',
    order: meta.order,
    slug,
  }
}

export const getDocMetadata = cache(async (slug: string, locale: string) => {
  const fullPath = getDocPath(slug, locale)

  try {
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data: meta } = matter(fileContents)

    return {
      meta: normalizeDocMeta(meta, slug),
      slug,
    }
  } catch (error) {
    console.error(`Error reading docs metadata: ${fullPath}`, error)
    return null
  }
})

export const getAllDocMetadata = cache(async (locale: string): Promise<DocMetadataEntry[]> => {
  const localeDirectory = path.join(DOCS_PATH, locale)

  try {
    if (!fs.existsSync(localeDirectory)) {
      return []
    }

    const files = fs.readdirSync(localeDirectory)
    const docs = await Promise.all(
      files
        .filter((file) => path.extname(file) === '.mdx')
        .map((file) => getDocMetadata(path.basename(file, '.mdx'), locale))
    )

    return docs
      .filter((doc): doc is DocMetadataEntry => doc !== null)
      .sort((a, b) => a.meta.order - b.meta.order)
  } catch (error) {
    console.error(`Error reading docs directory: ${localeDirectory}`, error)
    return []
  }
})

/** Drop the file's top-level `# Title` so single-page docs can own the section heading. */
function stripLeadingMarkdownH1(rawContent: string): string {
  return rawContent.replace(/^#\s+[^\n]*\n+/, '')
}

export const getDoc = cache(async (slug: string, locale: string): Promise<Doc | null> => {
  const fullPath = getDocPath(slug, locale)

  try {
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data: meta, content: rawContent } = matter(fileContents)
    const content = await compileMdxSource(stripLeadingMarkdownH1(rawContent))

    return {
      meta: normalizeDocMeta(meta, slug),
      content,
      slug,
    }
  } catch (error) {
    console.error(`Error reading docs MDX file: ${fullPath}`, error)
    return null
  }
})

export const getAllDocs = cache(async (locale: string) => {
  const metadata = await getAllDocMetadata(locale)
  const docs = await Promise.all(
    metadata.map(async (entry) => getDoc(entry.slug, locale))
  )

  return docs.filter((doc): doc is Doc => doc !== null)
})

export const getAdjacentDocs = cache(async (currentSlug: string, locale: string) => {
  const docs = await getAllDocMetadata(locale)
  const currentIndex = docs.findIndex((doc) => doc.slug === currentSlug)

  if (currentIndex === -1) {
    return { previous: null, next: null }
  }

  const previous = currentIndex > 0 ? docs[currentIndex - 1] : null
  const next = currentIndex < docs.length - 1 ? docs[currentIndex + 1] : null

  return {
    previous: previous ? { slug: previous.slug, title: previous.meta.title } : null,
    next: next ? { slug: next.slug, title: next.meta.title } : null,
  }
})
