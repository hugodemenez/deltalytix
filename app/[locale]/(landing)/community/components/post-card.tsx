'use client'

import { Post, PostStatus, PostType, Vote, VoteType } from '@/prisma/generated/prisma/browser'
import { formatDistanceToNow } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { ArrowBigDown, ArrowBigUp, MessageSquare, ImageIcon, Pencil, ExternalLink, Link as LinkIcon, Copy, Check, MoreHorizontal, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useI18n, useCurrentLocale } from '@/locales/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { ExtendedPost } from '../types'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog'
import { votePost, deletePost, getComments, addComment, editComment, deleteComment, editPost, updatePostStatus } from '@/app/[locale]/(landing)/actions/community'
import { toast } from 'sonner'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { CommentSection } from './comment-section'
import { Textarea } from '@/components/ui/textarea'
import { AuthPrompt } from './auth-prompt'
import { CopyNotification } from './copy-notification'
import { useUserStore } from '@/store/user-store'

interface Props {
  post: ExtendedPost
  isExpanded?: boolean
  isAuthor: boolean
}

const typeColors: Record<PostType, string> = {
  [PostType.FEATURE_REQUEST]: 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100',
  [PostType.BUG_REPORT]: 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100',
  [PostType.DISCUSSION]: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100',
}

const statusColors: Record<PostStatus, string> = {
  [PostStatus.OPEN]: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100',
  [PostStatus.IN_PROGRESS]: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
  [PostStatus.COMPLETED]: 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100',
  [PostStatus.CLOSED]: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
}

export function PostCard({ post, isExpanded = false, isAuthor }: Props) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const router = useRouter()
  const pathname = usePathname()
  const isPostPage = pathname === `/${locale}/community/post/${post.id}`
  const dateLocale = locale === 'fr' ? fr : enUS
  const [optimisticVotes, setOptimisticVotes] = useState<Vote[]>(post.votes)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(post.content)
  const [isCommentsOpen, setIsCommentsOpen] = useState(isExpanded)
  const [comments, setComments] = useState<any[]>([])
  const [commentCount, setCommentCount] = useState<number>(post._count.comments)
  const user = useUserStore(state => state.user)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [authAction, setAuthAction] = useState('')
  const [hasCopied, setHasCopied] = useState(false)
  const [showCopyNotification, setShowCopyNotification] = useState(false)

  const upvotes = optimisticVotes.filter(vote => vote.type === VoteType.UPVOTE).length
  const downvotes = optimisticVotes.filter(vote => vote.type === VoteType.DOWNVOTE).length
  const score = upvotes - downvotes

  const loadComments = useCallback(async function() {
    try {
      const fetchedComments = await getComments(post.id)
      setComments(fetchedComments)
    } catch (error) {
      toast.error('Failed to load comments')
    }
  }, [post.id]);

  useEffect(() => {
    if (isCommentsOpen) {
      loadComments()
    }
  }, [isCommentsOpen, loadComments])

  async function handleVote(type: VoteType) {
    if (!user) {
      setAuthAction(t('community.actions.vote'))
      setShowAuthPrompt(true)
      return
    }

    try {
      // Optimistic update
      const existingVote = optimisticVotes.find(v => v.userId === post.userId)
      let newVotes

      if (existingVote) {
        if (existingVote.type === type) {
          // Remove vote
          newVotes = optimisticVotes.filter(v => v.userId !== post.userId)
        } else {
          // Change vote type
          newVotes = optimisticVotes.map((v: Vote) =>
            v.userId === post.userId ? { ...v, type } : v
          )
        }
      } else {
        // Add new vote
        newVotes = [...optimisticVotes, {
          id: 'temp',
          type,
          postId: post.id,
          userId: post.userId,
          createdAt: new Date(),
        }]
      }

      setOptimisticVotes(newVotes)
      await votePost(post.id, type)
      router.refresh()
    } catch (error) {
      // Revert optimistic update
      setOptimisticVotes(post.votes)
      toast.error('Failed to vote')
    }
  }

  async function handleDelete() {
    try {
      await deletePost(post.id)
      router.refresh()
      toast.success('Post deleted')
    } catch (error) {
      toast.error('Failed to delete post')
    }
  }

  async function handleEdit() {
    try {
      await editPost(post.id, editedContent)
      router.refresh()
      setIsEditing(false)
      toast.success('Post updated')
    } catch (error) {
      toast.error('Failed to update post')
    }
  }

  async function handleAddComment(content: string, parentId: string | null) {
    if (!user) {
      setAuthAction(t('community.actions.comment'))
      setShowAuthPrompt(true)
      throw new Error('Authentication required')
    }

    const comment = await addComment(post.id, content, parentId)
    await loadComments()
    setCommentCount(prev => prev + 1)
    return { ...comment, replies: [] }
  }

  async function handleEditComment(commentId: string, content: string) {
    await editComment(commentId, content)
    await loadComments() // Reload comments to get the updated list
  }

  async function handleDeleteComment(commentId: string) {
    await deleteComment(commentId)
    await loadComments() // Reload comments to get the updated list
    setCommentCount(prev => prev - 1)
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/${locale}/community/post/${post.id}`
    navigator.clipboard.writeText(url)
    setHasCopied(true)
    setShowCopyNotification(true)
    setTimeout(() => {
      setHasCopied(false)
      setShowCopyNotification(false)
    }, 2000)
  }

  async function handleStatusChange(status: PostStatus) {
    try {
      await updatePostStatus(post.id, status)
      router.refresh()
      toast.success('Post status updated')
    } catch (error) {
      toast.error('Failed to update post status')
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className={typeColors[post.type as PostType]}>
                {(post.type as string).replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className={statusColors[post.status as PostStatus]}>
                {(post.status as string).replace('_', ' ')}
              </Badge>
            </div>
            <h3 className="font-semibold">{post.title}</h3>
            <p className="text-sm text-muted-foreground">
              {t('community.post.postedBy', {
                user: post.user.email.split('@')[0],
                time: formatDistanceToNow(post.createdAt, { locale: dateLocale })
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isPostPage && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href={`/${locale}/community/post/${post.id}`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {t('community.post.open')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyLink}>
                      {hasCopied ? (
                        <Check className="mr-2 h-4 w-4" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      {t('community.post.copyLink')}
                    </DropdownMenuItem>
                  </>
                )}
                {isAuthor && (
                  <>
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      {t('community.post.edit')}
                    </DropdownMenuItem>
                    {process.env.NODE_ENV === 'development' && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Settings2 className="mr-2 h-4 w-4" />
                          {t('community.post.status')}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem onClick={() => handleStatusChange(PostStatus.OPEN)}>
                            {t('community.status.open')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(PostStatus.COMPLETED)}>
                            {t('community.status.completed')}
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )}
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={handleDelete}
                    >
                      {t('community.post.delete')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false)
                    setEditedContent(post.content)
                  }}
                >
                  {t('community.post.cancel')}
                </Button>
                <Button onClick={handleEdit}>
                  {t('community.post.save')}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm">{post.content}</p>
          )}
          
          {post.screenshots && post.screenshots.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
                <span>
                  {post.screenshots.length}{' '}
                  {post.screenshots.length === 1
                    ? t('community.post.screenshot')
                    : t('community.post.screenshots')}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {post.screenshots.map((screenshot: string, index: number) => (
                  <Dialog key={index} open={selectedImage === screenshot} onOpenChange={(open) => !open && setSelectedImage(null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="p-0 h-24 w-24 relative overflow-hidden" onClick={() => setSelectedImage(screenshot)}>
                        <Image
                          src={screenshot}
                          alt={`Screenshot ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </Button>
                    </DialogTrigger>
                    {selectedImage === screenshot && (
                      <DialogContent className="max-w-4xl">
                        <div className="relative aspect-video">
                          <Image
                            src={screenshot}
                            alt={`Screenshot ${index + 1}`}
                            fill
                            className="object-contain"
                          />
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote(VoteType.UPVOTE)}
              >
                <ArrowBigUp className="mr-1 h-5 w-5" />
                {upvotes}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote(VoteType.DOWNVOTE)}
              >
                <ArrowBigDown className="mr-1 h-5 w-5" />
                {downvotes}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t('community.post.score')}: {score}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsCommentsOpen(!isCommentsOpen)}>
              <MessageSquare className="mr-1 h-4 w-4" />
              {commentCount} {t('community.post.comments')}
            </Button>
          </div>
        </CardFooter>
        {isCommentsOpen && (
          <div className="border-t px-6 py-4">
            <div className="max-w-3xl mx-auto space-y-6">
              <CommentSection
                postId={post.id}
                comments={comments}
                onAddComment={handleAddComment}
                onEditComment={handleEditComment}
                onDeleteComment={handleDeleteComment}
              />
            </div>
          </div>
        )}
      </Card>
      <CopyNotification 
        show={showCopyNotification} 
        message={t('community.post.linkCopied')} 
      />
      <AuthPrompt 
        open={showAuthPrompt} 
        onOpenChange={setShowAuthPrompt}
        action={authAction}
      />
    </>
  )
} 