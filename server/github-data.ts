'use server'
import { fetchGithubStars, getGithubStats } from '@/server/github';

const REPO_OWNER = process.env.NEXT_PUBLIC_REPO_OWNER || 'default_owner';
const REPO_NAME = process.env.NEXT_PUBLIC_REPO_NAME || 'default_repo';

export async function getGithubData() {
  const repoDataResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
    next: { revalidate: 7200 } // Cache for 2 hours (7200 seconds)
  });
  const repoData = await repoDataResponse.json();

  const commitsResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=1`, {
    next: { revalidate: 7200 }
  });
  const commits = await commitsResponse.json();
  const lastCommit = commits[0];

  const githubStats = await getGithubStats();
  const stars = await fetchGithubStars();

  return {
    repoData,
    githubStats,
    stars: stars.stargazers_count,
    lastCommit
  };
}