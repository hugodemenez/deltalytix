'use server'

import { Octokit } from '@octokit/rest'
import { unstable_cache } from 'next/cache'
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from '@/lib/github-repo'
import {
  buildContributionGraph,
  type ContributionGraphData,
} from '../components/contribution-graph'

const REQUEST_TIMEOUT_MS = 8000
const MAX_RETRIES = 2
const RETRY_BASE_DELAY_MS = 400
const WEEKS_TO_SHOW = 26

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  request: {
    timeout: REQUEST_TIMEOUT_MS
  }
})

interface GithubData {
  repoData: {
    name: string;
    description: string;
    language: string;
    license: { spdx_id: string } | null;
    stargazers_count: number;
    forks_count: number;
    updated_at: string;
  };
  githubStats: {
    repository: {
      stargazers: { totalCount: number };
      forks: { totalCount: number };
      commits: { history: { totalCount: number } };
    };
    contributionGraph: ContributionGraphData;
  };
  stars: number;
  lastCommit: {
    commit: {
      committer: {
        date: string;
      };
    };
  };
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const isRetryableError = (error: unknown) => {
  const status = (error as { status?: number; response?: { status?: number } })?.status
    ?? (error as { response?: { status?: number } })?.response?.status
  if (status && [429, 500, 502, 503, 504].includes(status)) return true

  const code = (error as { code?: string; cause?: { code?: string } })?.code
    ?? (error as { cause?: { code?: string } })?.cause?.code
  return [
    'UND_ERR_SOCKET',
    'UND_ERR_CONNECT_TIMEOUT',
    'ECONNRESET',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'ECONNREFUSED'
  ].includes(code || '')
}

const withRetry = async <T>(label: string, fn: () => Promise<T>) => {
  let attempt = 0
  while (true) {
    try {
      return await fn()
    } catch (error) {
      attempt += 1
      if (attempt > MAX_RETRIES || !isRetryableError(error)) {
        throw error
      }
      const jitter = Math.floor(Math.random() * 100)
      const delay = RETRY_BASE_DELAY_MS * (2 ** (attempt - 1)) + jitter
      console.warn(`Retrying GitHub request (${label}) after ${delay}ms`, error)
      await sleep(delay)
    }
  }
}

// Cached function to fetch all GitHub data in a single operation
const getCachedGithubData = unstable_cache(
  async (): Promise<GithubData> => {
    try {
      // Fetch repository data
      const repoResponse = await withRetry('repo data', () =>
        octokit.repos.get({
          owner: GITHUB_REPO_OWNER,
          repo: GITHUB_REPO_NAME,
        })
      )

      const repoData = repoResponse.data

      // Get the repository creation date as the starting point
      const today = new Date()
      const weeksToShow = WEEKS_TO_SHOW
      const activityStartDate = new Date(today)
      activityStartDate.setDate(today.getDate() - (weeksToShow * 7))
      
      const defaultBranch = repoData.default_branch || 'main'

      // Get commits from default branch to build weekly activity chart
      const allCommits: any[] = []
      let page = 1
      const perPage = 100
      let hasMoreCommits = true
      
      while (hasMoreCommits && page <= 10) { // Limit to 1000 commits
        try {
          const commitsResponse = await withRetry(`commits page ${page}`, () =>
            octokit.repos.listCommits({
              owner: GITHUB_REPO_OWNER,
              repo: GITHUB_REPO_NAME,
              per_page: perPage,
              page: page,
              since: activityStartDate.toISOString(),
              sha: defaultBranch
            })
          )
          
          if (commitsResponse.data.length === 0) {
            hasMoreCommits = false
          } else {
            commitsResponse.data.forEach(commit => {
              if (commit.sha) {
                allCommits.push(commit)
              }
            })
            page++
            if (commitsResponse.data.length < perPage) {
              hasMoreCommits = false
            }
          }
        } catch (error) {
          console.log(`Error fetching commits from ${defaultBranch} page ${page}:`, error)
          hasMoreCommits = false
        }
      }

      // Find the most recent commit across all branches
      let latestCommit: any = null
      try {
        const latestCommitResponse = await withRetry('latest commit', () =>
          octokit.repos.listCommits({
            owner: GITHUB_REPO_OWNER,
            repo: GITHUB_REPO_NAME,
            per_page: 1,
            page: 1,
            sha: defaultBranch
          })
        )
        latestCommit = latestCommitResponse.data[0] ?? null
      } catch (error) {
        console.log(`Error fetching latest commit from ${defaultBranch}:`, error)
        if (allCommits.length > 0) {
          latestCommit = allCommits.reduce((latest, commit) => {
            const commitDate = new Date(commit.commit.committer.date)
            const latestDate = latest ? new Date(latest.commit.committer.date) : new Date(0)
            return commitDate > latestDate ? commit : latest
          })
        }
      }

       const dailyCommits = new Map<string, number>()

       allCommits.forEach(commit => {
         if (commit.commit?.author?.date) {
           const commitDate = new Date(commit.commit.author.date)
           const dateKey = commitDate.toISOString().split('T')[0]
           dailyCommits.set(dateKey, (dailyCommits.get(dateKey) || 0) + 1)
         }
       })

       const contributionGraph = buildContributionGraph(dailyCommits, weeksToShow)

      const githubData: GithubData = {
        repoData: {
          name: repoData.name,
          description: repoData.description || '',
          language: repoData.language || 'TypeScript',
          license: repoData.license?.spdx_id ? { spdx_id: repoData.license.spdx_id } : null,
          stargazers_count: repoData.stargazers_count,
          forks_count: repoData.forks_count,
          updated_at: repoData.updated_at,
        },
        githubStats: {
          repository: {
            stargazers: { totalCount: repoData.stargazers_count },
            forks: { totalCount: repoData.forks_count },
            commits: { history: { totalCount: allCommits.length } },
          },
          contributionGraph,
        },
        stars: repoData.stargazers_count,
        lastCommit: {
          commit: {
            committer: {
              date: latestCommit?.commit?.committer?.date || new Date().toISOString(),
            },
          },
        },
      }
      return githubData
    } catch (error) {
      console.error('Error fetching GitHub data:', error)

      // Return fallback data instead of throwing
      return {
        repoData: {
          name: GITHUB_REPO_NAME,
          description: 'A trading analytics platform',
          language: 'TypeScript',
          license: { spdx_id: 'MIT' },
          stargazers_count: 0,
          forks_count: 0,
          updated_at: new Date().toISOString(),
        },
                 githubStats: {
           repository: {
             stargazers: { totalCount: 0 },
             forks: { totalCount: 0 },
             commits: { history: { totalCount: 0 } },
           },
           contributionGraph: buildContributionGraph(new Map(), WEEKS_TO_SHOW),
         },
        stars: 0,
        lastCommit: {
          commit: {
            committer: {
              date: new Date().toISOString(),
            },
          },
        },
      }
    }
  },
  // Cache key
  [`github-data-${GITHUB_REPO_OWNER}-${GITHUB_REPO_NAME}`],
  {
    tags: [`github-data`],
    revalidate: 3600 // Revalidate every hour (3600 seconds)
  }
)

export async function getGithubData(): Promise<GithubData> {
  return getCachedGithubData()
}