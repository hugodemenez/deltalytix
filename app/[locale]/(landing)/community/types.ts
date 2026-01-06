import { Post, User, Vote } from '@/prisma/generated/prisma/client'

export type ExtendedPost = Post & {
  user: Pick<User, 'email' | 'id'>
  votes: Vote[]
  _count: {
    comments: number
  }
  isAuthor: boolean
} 