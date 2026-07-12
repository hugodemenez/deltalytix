import { GITHUB_REPO_OWNER } from "@/lib/github-repo";

export const YOUTUBE_CHANNEL_URL =
  process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_URL ??
  `https://www.youtube.com/@${GITHUB_REPO_OWNER}`;
