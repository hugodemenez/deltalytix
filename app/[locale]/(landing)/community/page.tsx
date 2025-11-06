import { Metadata } from 'next'
import { getPosts } from '@/app/[locale]/(landing)/actions/community'
import { PostList } from './components/post-list'
import { CreatePost } from './components/create-post'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { getI18n } from '@/locales/server'
import { DataProvider } from '@/context/data-provider'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getI18n()
  
  return {
    title: `${t('community.title')} - Delatlytix`,
    description: t('community.description'),
  }
}

export default async function CommunityPage() {
  const t = await getI18n()
  const posts = await getPosts()
  return (
      <div className="container mx-auto max-w-4xl py-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('community.title')}</h1>
          <p className="text-muted-foreground">
            {t('community.description')}
          </p>
        </div>
        <CreatePost>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('community.newPost')}
          </Button>
        </CreatePost>
      </div>

      <PostList initialPosts={posts} />
    </div>
  )
} 