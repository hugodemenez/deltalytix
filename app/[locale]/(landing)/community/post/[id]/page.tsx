import { getPost, getComments } from '@/app/[locale]/(landing)/actions/community'
import { PostCard } from '../../components/post-card'
import { notFound } from 'next/navigation'
import { ExtendedPost } from '../../types'

interface Props {
  params: Promise<{
    id: string
  }>
}

export default async function PostPage(props: Props) {
  const params = await props.params;

  try {
    const post = await getPost(params.id)
    const comments = await getComments(params.id)

    if (!post) {
      notFound()
    }

    const extendedPost: ExtendedPost = {
      ...post,
      _count: { comments: comments.length }
    }

    return (
      <div className="container max-w-4xl py-8">
        <div className="space-y-8">
          <PostCard 
            post={extendedPost}
            isExpanded={true}
            isAuthor={extendedPost.isAuthor}
          />
        </div>
      </div>
    )
  } catch (error) {
    notFound()
  }
} 