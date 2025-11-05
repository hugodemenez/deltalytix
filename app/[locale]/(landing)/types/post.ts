export type Status = 'completed' | 'in-progress' | 'upcoming';

export interface PostMeta {
  title: string;
  description: string;
  date: string;
  status: Status;
  completedDate?: string;
  estimatedDate?: string;
  image?: string;
  slug: string;
  youtubeVideoId?: string;
}

export interface Post {
  meta: PostMeta;
  content: string;
} 