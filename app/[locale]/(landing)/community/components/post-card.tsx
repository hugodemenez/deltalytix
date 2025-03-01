'use client'

import { Post, PostStatus, PostType, Vote, VoteType } from '@prisma/client'
import { formatDistanceToNow } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { ArrowBigDown, ArrowBigUp, MessageSquare, ImageIcon, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useI18n, useCurrentLocale } from '@/locales/client'
import { useRouter } from 'next/navigation'
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
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog'
import { votePost, deletePost, getComments, addComment, editComment, deleteComment, editPost } from '@/server/community'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useUserData } from '@/components/context/user-data'
import { CommentSection } from './comment-section'
import { Textarea } from '@/components/ui/textarea'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { AuthPrompt } from './auth-prompt'

type ExtendedPost = Post & {
  user: {
    email: string
    id: string
  }
  votes: Vote[]
}

type Props = {
  post: ExtendedPost
}

const typeColors = {
  [PostType.FEATURE_REQUEST]: 'bg-blue-500',
  [PostType.BUG_REPORT]: 'bg-red-500',
  [PostType.DISCUSSION]: 'bg-green-500',
}

const statusColors = {
  [PostStatus.OPEN]: 'bg-green-500',
  [PostStatus.IN_PROGRESS]: 'bg-yellow-500',
  [PostStatus.COMPLETED]: 'bg-blue-500',
  [PostStatus.CLOSED]: 'bg-gray-500',
}

export function PostCard({ post }: Props) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const router = useRouter()
  const dateLocale = locale === 'fr' ? fr : enUS
  const [optimisticVotes, setOptimisticVotes] = useState(post.votes)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(post.content)
  const [isCommentsOpen, setIsCommentsOpen] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [commentCount, setCommentCount] = useState(0)
  const { user } = useUserData()
  const isAuthor = user?.id === post.user.id
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [authAction, setAuthAction] = useState('')

  const upvotes = optimisticVotes.filter(vote => vote.type === VoteType.UPVOTE).length
  const downvotes = optimisticVotes.filter(vote => vote.type === VoteType.DOWNVOTE).length
  const score = upvotes - downvotes

  useEffect(() => {
    if (isCommentsOpen) {
      loadComments()
    }
  }, [isCommentsOpen])

  async function loadComments() {
    try {
      const fetchedComments = await getComments(post.id)
      setComments(fetchedComments)
      // Calculate total comments including replies
      const countComments = (comments: any[]): number => {
        return comments.reduce((acc, comment) => {
          return acc + 1 + (comment.replies ? countComments(comment.replies) : 0)
        }, 0)
      }
      setCommentCount(countComments(fetchedComments))
    } catch (error) {
      toast.error('Failed to load comments')
    }
  }

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
          newVotes = optimisticVotes.map(v =>
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
    return { ...comment, replies: [] }
  }

  async function handleEditComment(commentId: string, content: string) {
    await editComment(commentId, content)
    await loadComments() // Reload comments to get the updated list
  }

  async function handleDeleteComment(commentId: string) {
    await deleteComment(commentId)
    await loadComments() // Reload comments to get the updated list
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className={typeColors[post.type]}>
                {post.type.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className={statusColors[post.status]}>
                {post.status.replace('_', ' ')}
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
          {isAuthor && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  •••
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {t('community.post.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={handleDelete}
                >
                  {t('community.post.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
                {post.screenshots.map((screenshot, index) => (
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
      <AuthPrompt 
        open={showAuthPrompt} 
        onOpenChange={setShowAuthPrompt}
        action={authAction}
      />
    </>
  )
} 