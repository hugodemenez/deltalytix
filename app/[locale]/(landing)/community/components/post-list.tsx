'use client'
import { useState } from 'react'
import { Post, PostType, PostStatus } from '@/prisma/generated/prisma/browser'
import { PostCard } from './post-card'
import { ExtendedPost } from '../types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/locales/client'

type Props = {
  initialPosts: ExtendedPost[]
}

export function PostList({ initialPosts }: Props) {
  const t = useI18n()
  const [filter, setFilter] = useState<PostType | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'ALL'>(PostStatus.OPEN)

  const filteredPosts = initialPosts.filter((post) => {
    const matchesType = filter === 'ALL' || post.type === filter
    const matchesStatus = statusFilter === 'ALL' || post.status === statusFilter
    const matchesSearch = post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.content.toLowerCase().includes(search.toLowerCase())
    return matchesType && matchesStatus && matchesSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder={t('community.searchPosts')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-[300px]"
        />
        <div className="flex gap-4">
          <Select
            value={filter}
            onValueChange={(value) => setFilter(value as PostType | 'ALL')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('community.filterByType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('community.types.all')}</SelectItem>
              <SelectItem value={PostType.FEATURE_REQUEST}>
                {t('community.types.featureRequest')}
              </SelectItem>
              <SelectItem value={PostType.BUG_REPORT}>{t('community.types.bugReport')}</SelectItem>
              <SelectItem value={PostType.DISCUSSION}>{t('community.types.discussion')}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as PostStatus | 'ALL')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('community.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('community.status.all')}</SelectItem>
              <SelectItem value={PostStatus.OPEN}>{t('community.status.open')}</SelectItem>
              <SelectItem value={PostStatus.COMPLETED}>{t('community.status.completed')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t('community.noPosts')}</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isAuthor={post.isAuthor}
            />
          ))
        )}
      </div>
    </div>
  )
} 