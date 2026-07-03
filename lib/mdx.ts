import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { compileMDX } from 'next-mdx-remote/rsc'
import { cache } from 'react'

const postsDirectory = path.join(process.cwd(), 'content/updates')

type PostMetadataEntry = NonNullable<Awaited<ReturnType<typeof getPostMetadata>>>
type AllPostMetadata = PostMetadataEntry[]

const allPostMetadataByLocale = new Map<string, Promise<AllPostMetadata>>()

function getPostPath(slug: string, locale: string) {
  return path.join(postsDirectory, locale, `${slug}.mdx`)
}

function normalizePostMeta(meta: Record<string, any>, slug: string) {
  return {
    ...meta,
    title: meta.title || slug,
    description: meta.description || '',
    date: meta.date || new Date().toISOString(),
    status: meta.status || 'upcoming',
    image: meta.image || null,
    updatedAt: meta.updatedAt || meta.date || new Date().toISOString(),
  }
}

export const getPostMetadata = cache(async (slug: string, locale: string) => {
  const fullPath = getPostPath(slug, locale)

  try {
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data: meta } = matter(fileContents)

    return {
      meta: normalizePostMeta(meta, slug),
      slug,
    }
  } catch (error) {
    console.error(`Error reading MDX metadata: ${fullPath}`, error)
    return null
  }
})

async function loadAllPostMetadata(locale: string): Promise<AllPostMetadata> {
  const localeDirectory = path.join(postsDirectory, locale)

  try {
    const files = fs.readdirSync(localeDirectory)
    const posts = await Promise.all(
      files
        .filter((file) => path.extname(file) === '.mdx')
        .map((file) => getPostMetadata(path.basename(file, '.mdx'), locale))
    )

    return posts
      .filter((post): post is PostMetadataEntry => post !== null)
      .sort((a, b) => new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime())
  } catch (error) {
    console.error(`Error reading posts directory: ${localeDirectory}`, error)
    return []
  }
}

export const getAllPostMetadata = cache(async (locale: string) => {
  let promise = allPostMetadataByLocale.get(locale)
  if (!promise) {
    promise = loadAllPostMetadata(locale)
    allPostMetadataByLocale.set(locale, promise)
  }
  return promise
})

// Cache the MDX compilation results
export const getPost = cache(async (slug: string, locale: string) => {
  const fullPath = getPostPath(slug, locale)

  try {
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data: meta, content: rawContent } = matter(fileContents)
    const hasCodeBlocks = /^```|<pre|<code/m.test(rawContent)
    const hasImages = /!\[|<img|<Image/.test(rawContent)
    const rehypePlugins: any[] = [
      (await import('rehype-slug')).default,
      [(await import('rehype-autolink-headings')).default, {
        behavior: 'wrap',
        properties: {
          className: ['anchor'],
          'aria-label': 'Link to this section'
        }
      }],
    ]

    if (hasImages) {
      rehypePlugins.push([
        (await import('rehype-img-size')).default,
        {
          dir: path.join(process.cwd(), 'public')
        },
      ])
    }

    if (hasCodeBlocks) {
      rehypePlugins.push([
        (await import('rehype-pretty-code')).default,
        {
          theme: {
            dark: 'github-dark',
            light: 'github-light',
          },
          keepBackground: true,
          onVisitLine(node: any) {
            if (node.children.length === 0) {
              node.children = [{ type: 'text', value: ' ' }]
            }
          },
          onVisitHighlightedLine(node: any) {
            node.properties.className.push('line--highlighted')
          },
          onVisitHighlightedWord(node: any) {
            node.properties.className = ['word--highlighted']
          },
        },
      ])
    }

    const { content } = await compileMDX({
      source: rawContent,
      options: { 
        mdxOptions: {
          remarkPlugins: [
            (await import('remark-gfm')).default,
            // Add remark-squeeze-paragraphs to remove empty paragraphs
            (await import('remark-squeeze-paragraphs')).default,
          ],
          rehypePlugins,
        },
      },
    })

    return {
      meta: normalizePostMeta(meta, slug),
      content,
      slug,
    }
  } catch (error) {
    console.error(`Error reading MDX file: ${fullPath}`, error)
    return null
  }
})

// Cache the posts list
export const getAllPosts = cache(async (locale: string) => {
  const localeDirectory = path.join(postsDirectory, locale)

  try {
    const files = fs.readdirSync(localeDirectory)
    const posts = await Promise.all(
      files
        .filter((file) => path.extname(file) === '.mdx')
        .map(async (file) => {
          const slug = path.basename(file, '.mdx')
          const post = await getPost(slug, locale)
          return post
        })
    )

    return posts.filter((post): post is NonNullable<typeof post> => post !== null)
      .sort((a, b) => new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime())
  } catch (error) {
    console.error(`Error reading posts directory: ${localeDirectory}`, error)
    return []
  }
})

// Get adjacent posts (previous and next) for navigation
export const getAdjacentPosts = cache(async (currentSlug: string, locale: string) => {
  const posts = await getAllPostMetadata(locale)
  const currentIndex = posts.findIndex(post => post.slug === currentSlug)
  
  if (currentIndex === -1) {
    return { previous: null, next: null }
  }
  
  // Posts are sorted by date descending, so:
  // - "previous" (older) is the next item in the array (higher index)
  // - "next" (newer) is the previous item in the array (lower index)
  const previous = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null
  const next = currentIndex > 0 ? posts[currentIndex - 1] : null
  
  return {
    previous: previous ? { slug: previous.slug, title: previous.meta.title } : null,
    next: next ? { slug: next.slug, title: next.meta.title } : null,
  }
})
