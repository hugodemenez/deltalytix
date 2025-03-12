import { Post, Vote, VoteType } from '@prisma/client'

export type ExtendedPost = Post & {
  user: {
    email: string
    id: string
  }
  votes: Vote[]
  _count: {
    comments: number
  }
} 