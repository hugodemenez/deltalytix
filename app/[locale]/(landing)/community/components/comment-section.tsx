import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { useUserStore } from '@/store/user-store'
import { useI18n } from '@/locales/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Reply } from 'lucide-react'
import { toast } from 'sonner'

interface Comment {
  id: string
  content: string
  createdAt: Date
  user: {
    id: string
    email: string
  }
  parentId: string | null
  replies: Comment[]
}

interface CommentSectionProps {
  postId: string
  comments: Comment[]
  onAddComment: (content: string, parentId: string | null) => Promise<Comment>
  onEditComment: (commentId: string, content: string) => Promise<void>
  onDeleteComment: (commentId: string) => Promise<void>
}

function CommentComponent({ 
  comment, 
  onAddComment, 
  onEditComment, 
  onDeleteComment,
  level = 0 
}: { 
  comment: Comment
  onAddComment: (content: string, parentId: string | null) => Promise<Comment>
  onEditComment: (commentId: string, content: string) => Promise<void>
  onDeleteComment: (commentId: string) => Promise<void>
  level?: number
}) {
  const t = useI18n()
  const user = useUserStore(state => state.user)
  const [isReplying, setIsReplying] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(comment.content)
  const [replyContent, setReplyContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isAuthor = user?.id === comment.user.id

  const handleReply = async () => {
    if (isSubmitting || !replyContent.trim()) return
    
    setIsSubmitting(true)
    try {
      const addedComment = await onAddComment(replyContent, comment.id)
      setReplyContent('')
      setIsReplying(false)
      toast.success(t('community.comments.success.reply'))
    } catch (error) {
      toast.error(t('community.comments.error.reply'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (isSubmitting || !content.trim()) return
    
    setIsSubmitting(true)
    try {
      await onEditComment(comment.id, content)
      setIsEditing(false)
      toast.success(t('community.comments.success.update'))
    } catch (error) {
      toast.error(t('community.comments.error.update'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    try {
      await onDeleteComment(comment.id)
      toast.success(t('community.comments.success.delete'))
    } catch (error) {
      toast.error(t('community.comments.error.delete'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback>{comment.user.email[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{comment.user.email.split('@')[0]}</span>
              <span className="text-xs text-muted-foreground">
                {t('community.comments.timeAgo', { time: formatDistanceToNow(comment.createdAt) })}
              </span>
            </div>
            {isAuthor && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    {t('community.comments.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={handleDelete}
                  >
                    {t('community.comments.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] w-full resize-none"
                disabled={isSubmitting}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                >
                  {t('community.comments.cancel')}
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleEdit}
                  disabled={isSubmitting || !content.trim()}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {t('common.saving')}
                    </div>
                  ) : t('community.comments.save')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm leading-relaxed">{comment.content}</div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 text-muted-foreground hover:text-foreground"
              onClick={() => setIsReplying(!isReplying)}
              disabled={isSubmitting}
            >
              <Reply className="mr-1 h-3 w-3" />
              {t('community.comments.reply')}
            </Button>
          </div>
          {isReplying && (
            <div className="mt-4 space-y-2">
              <Textarea
                placeholder={t('community.comments.writeReply')}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[100px] w-full resize-none"
                disabled={isSubmitting}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsReplying(false)
                    setReplyContent('')
                  }}
                  disabled={isSubmitting}
                >
                  {t('community.comments.cancel')}
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleReply}
                  disabled={isSubmitting || !replyContent.trim()}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {t('common.saving')}
                    </div>
                  ) : t('community.comments.reply')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {comment.replies.length > 0 && (
        <div className={`ml-4 space-y-4 pl-4 border-l ${level >= 3 ? 'opacity-80' : ''}`}>
          {comment.replies.map((reply) => (
            <CommentComponent
              key={reply.id}
              comment={reply}
              onAddComment={onAddComment}
              onEditComment={onEditComment}
              onDeleteComment={onDeleteComment}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function CommentSection({
  postId,
  comments,
  onAddComment,
  onEditComment,
  onDeleteComment,
}: CommentSectionProps) {
  const t = useI18n()
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const user = useUserStore(state => state.user)

  const handleAddComment = async () => {
    if (isSubmitting || !newComment.trim()) return
    
    setIsSubmitting(true)
    try {
      const addedComment = await onAddComment(newComment, null)
      setNewComment('')
      toast.success(t('community.comments.success.add'))
    } catch (error) {
      toast.error(t('community.comments.error.add'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="rounded-lg border bg-muted/50 p-6 text-center text-muted-foreground">
        {t('community.comments.signInPrompt')}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback>{user?.email?.[0].toUpperCase() || ''}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder={t('community.comments.writeComment')}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[100px] w-full resize-none"
              disabled={isSubmitting}
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleAddComment}
                disabled={isSubmitting || !newComment.trim()}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t('common.saving')}
                  </div>
                ) : t('community.comments.comment')}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-6 divide-y">
        {comments.map((comment) => (
          <div key={comment.id} className="pt-6 first:pt-0">
            <CommentComponent
              comment={comment}
              onAddComment={onAddComment}
              onEditComment={onEditComment}
              onDeleteComment={onDeleteComment}
            />
          </div>
        ))}
        {comments.length === 0 && (
          <div className="py-6 text-center text-muted-foreground">
            {t('community.comments.noComments')}
          </div>
        )}
      </div>
    </div>
  )
} 