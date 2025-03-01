'use server'

import { createClient } from './auth'
import { PrismaClient, PostType, PostStatus, VoteType } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import sharp from 'sharp'

// Helper function to check if user is admin
async function isAdmin(userId: string) {
  return userId === process.env.ALLOWED_ADMIN_USER_ID
}

// Get all posts with votes and user information
export async function getPosts() {
  try {
    const prisma = new PrismaClient()
    const posts = await prisma.post.findMany({
      include: {
        user: {
          select: {
            email: true,
            id: true,
          }
        },
        votes: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return posts
  } catch (error) {
    console.error('Failed to fetch posts:', error)
    throw new Error('Failed to fetch posts')
  }
}

// Get current user's permissions for a post
export async function getPostPermissions(postUserId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { canDelete: false, canChangeStatus: false }
  }

  return {
    canDelete: postUserId === user.id,
    canChangeStatus: await isAdmin(user.id)
  }
}

// Create a new post
export async function createPost(formData: {
  title: string
  content: string
  type: PostType
  screenshots?: string[]
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {
    const prisma = new PrismaClient()

    // Process screenshots if they exist
    const processedScreenshots = await Promise.all(
      (formData.screenshots || []).map(async (screenshot) => {
        try {
          // Remove the data:image/[type];base64, prefix
          const base64Data = screenshot.split(',')[1]
          const buffer = Buffer.from(base64Data, 'base64')

          // Process image with sharp
          const processedBuffer = await sharp(buffer)
            .resize(1200, 1200, { // Max dimensions
              fit: 'inside',
              withoutEnlargement: true
            })
            .webp({ quality: 80 }) // Convert to WebP for better compression
            .toBuffer()

          // Convert back to base64
          return `data:image/webp;base64,${processedBuffer.toString('base64')}`
        } catch (error) {
          console.error('Failed to process screenshot:', error)
          return null
        }
      })
    )

    const post = await prisma.post.create({
      data: {
        ...formData,
        screenshots: processedScreenshots.filter(Boolean) as string[],
        userId: user.id,
        status: PostStatus.OPEN,
      },
    })

    revalidatePath('/community', 'page')
    return { post }
  } catch (error) {
    console.error('Failed to create post:', error)
    throw new Error('Failed to create post')
  }
}

// Update post status (only for admins)
export async function updatePostStatus(id: string, status: PostStatus) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // Check if user is admin
  if (!await isAdmin(user.id)) {
    throw new Error('Only administrators can change post status')
  }

  try {
    const prisma = new PrismaClient()
    await prisma.post.update({
      where: { id },
      data: { status }
    })

    revalidatePath('/community')
    return { success: true }
  } catch (error) {
    console.error('Failed to update post status:', error)
    throw new Error('Failed to update post status')
  }
}

// Delete post (only for post owner)
export async function deletePost(id: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {
    const prisma = new PrismaClient()
    const post = await prisma.post.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!post || post.userId !== user.id) {
      throw new Error('Only the author can delete this post')
    }

    await prisma.post.delete({
      where: { id }
    })

    revalidatePath('/community')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete post:', error)
    throw new Error('Failed to delete post')
  }
}

// Vote on a post
export async function votePost(postId: string, voteType: VoteType) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {
    const prisma = new PrismaClient()
    
    // Check if user has already voted
    const existingVote = await prisma.vote.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: user.id
        }
      }
    })

    if (existingVote) {
      if (existingVote.type === voteType) {
        // Remove vote if clicking the same type
        await prisma.vote.delete({
          where: {
            postId_userId: {
              postId,
              userId: user.id
            }
          }
        })
      } else {
        // Update vote type if different
        await prisma.vote.update({
          where: {
            postId_userId: {
              postId,
              userId: user.id
            }
          },
          data: { type: voteType }
        })
      }
    } else {
      // Create new vote
      await prisma.vote.create({
        data: {
          type: voteType,
          postId,
          userId: user.id
        }
      })
    }

    revalidatePath('/community')
    return { success: true }
  } catch (error) {
    console.error('Failed to vote:', error)
    throw new Error('Failed to vote on post')
  }
}

// Get post by ID with votes and user information
export async function getPost(id: string) {
  try {
    const prisma = new PrismaClient()
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
          }
        },
        votes: {
          include: {
            user: {
              select: {
                email: true,
              }
            }
          }
        },
      },
    })

    if (!post) {
      throw new Error('Post not found')
    }

    return post
  } catch (error) {
    console.error('Failed to fetch post:', error)
    throw new Error('Failed to fetch post')
  }
}

// Get comments for a post
export async function getComments(postId: string) {
  try {
    const prisma = new PrismaClient()
    const comments = await prisma.comment.findMany({
      where: {
        postId,
        parentId: null // Get only top-level comments
      },
      include: {
        user: {
          select: {
            email: true,
            id: true,
          }
        },
        replies: {
          include: {
            user: {
              select: {
                email: true,
                id: true,
              }
            },
            replies: {
              include: {
                user: {
                  select: {
                    email: true,
                    id: true,
                  }
                },
                replies: {
                  include: {
                    user: {
                      select: {
                        email: true,
                        id: true,
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return comments
  } catch (error) {
    console.error('Failed to fetch comments:', error)
    throw new Error('Failed to fetch comments')
  }
}

// Add a comment
export async function addComment(postId: string, content: string, parentId: string | null = null) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {
    const prisma = new PrismaClient()
    const comment = await prisma.comment.create({
      data: {
        content,
        postId,
        userId: user.id,
        parentId
      },
      include: {
        user: {
          select: {
            email: true,
            id: true,
          }
        }
      }
    })

    revalidatePath('/community')
    return comment
  } catch (error) {
    console.error('Failed to add comment:', error)
    throw new Error('Failed to add comment')
  }
}

// Edit a comment
export async function editComment(commentId: string, content: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {
    const prisma = new PrismaClient()
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true }
    })

    if (!comment || comment.userId !== user.id) {
      throw new Error('Only the author can edit this comment')
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: { content }
    })

    revalidatePath('/community')
    return { success: true }
  } catch (error) {
    console.error('Failed to edit comment:', error)
    throw new Error('Failed to edit comment')
  }
}

// Delete a comment
export async function deleteComment(commentId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {
    const prisma = new PrismaClient()
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true }
    })

    if (!comment || comment.userId !== user.id) {
      throw new Error('Only the author can delete this comment')
    }

    await prisma.comment.delete({
      where: { id: commentId }
    })

    revalidatePath('/community')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete comment:', error)
    throw new Error('Failed to delete comment')
  }
}

// Edit a post (only for post owner)
export async function editPost(id: string, content: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {
    const prisma = new PrismaClient()
    const post = await prisma.post.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!post || post.userId !== user.id) {
      throw new Error('Only the author can edit this post')
    }

    await prisma.post.update({
      where: { id },
      data: { content }
    })

    revalidatePath('/community')
    return { success: true }
  } catch (error) {
    console.error('Failed to edit post:', error)
    throw new Error('Failed to edit post')
  }
} 