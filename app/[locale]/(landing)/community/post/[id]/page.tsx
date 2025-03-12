import { getPost, getComments } from '@/server/community'
import { PostCard } from '../../components/post-card'
import { notFound } from 'next/navigation'

interface Props {
  params: {
    id: string
  }
}

export default async function PostPage({ params }: Props) {
  
  try {
    const post = await getPost(params.id)
    const comments = await getComments(params.id)

    if (!post) {
      notFound()
    }

    return (
      <div className="container max-w-4xl py-8">
        <div className="space-y-8">
          <PostCard 
            post={{ ...post, _count: { comments: comments.length } }} 
            isExpanded={true}
          />
        </div>
      </div>
    )
  } catch (error) {
    notFound()
  }
} 