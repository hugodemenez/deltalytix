import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { Post, PostMeta } from '@/app/[locale]/(landing)/types/post'
import { cache } from 'react'
import { findVideoIdForPostDateAction } from '@/app/[locale]/admin/actions/youtube'

const POSTS_PATH = path.join(process.cwd(), 'content/updates')

export const getPostBySlug = cache(async function(
  slug: string,
  locale: string
): Promise<Post> {
  const realSlug = slug.replace(/\.mdx$/, '')
  const fullPath = path.join(POSTS_PATH, locale, `${realSlug}.mdx`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)

  // For French locale and completed posts, try to find matching YouTube video
  let youtubeVideoId = data.youtubeVideoId;
  if (locale === 'fr' && data.status === 'completed' && data.completedDate && !youtubeVideoId) {
    try {
      youtubeVideoId = await findVideoIdForPostDateAction(data.completedDate);
    } catch (error) {
      console.error(`Error finding video for post ${realSlug}:`, error);
    }
  }

  return {
    meta: {
      ...data,
      slug: realSlug,
      youtubeVideoId,
    } as PostMeta,
    content,
  }
})

export const getAllPosts = cache(async function(locale: string): Promise<Post[]> {
  const localePath = path.join(POSTS_PATH, locale)
  
  if (!fs.existsSync(localePath)) {
    return []
  }

  const slugs = fs.readdirSync(localePath)
    .filter((slug) => /\.mdx$/.test(slug))

  const posts = await Promise.all(
    slugs.map((slug) => getPostBySlug(slug, locale))
  )

  return posts.sort((post1, post2) => 
    new Date(post2.meta.date).getTime() - new Date(post1.meta.date).getTime()
  )
})

export const getPostsByStatus = cache(async function(
  status: string,
  locale: string
): Promise<Post[]> {
  const posts = await getAllPosts(locale)
  return posts.filter(post => post.meta.status === status)
})

export async function generateStaticParams() {
  const locales = ['en', 'fr']
  const paths: { params: { locale: string; slug: string } }[] = []

  for (const locale of locales) {
    const posts = await getAllPosts(locale)
    paths.push(...posts.map((post) => ({
      params: {
        locale,
        slug: post.meta.slug,
      },
    })))
  }

  return paths
} 