'use server'

import { Octokit } from '@octokit/rest'
import { unstable_cache } from 'next/cache'
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from '@/lib/github-repo'
import {
  buildContributionGraphData,
  type ContributionGraphData,
} from '@/lib/contribution-graph'

const REQUEST_TIMEOUT_MS = 8000
const MAX_RETRIES = 2
const RETRY_BASE_DELAY_MS = 400
const MAX_BRANCHES = 50
const MAX_PAGES_PER_BRANCH = 20

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  request: {
    timeout: REQUEST_TIMEOUT_MS
  }
})

interface GithubCommit {
  sha: string
  commit: {
    author?: { date?: string } | null
    committer?: { date?: string } | null
  }
}

interface GithubData {
  repoData: {
    name: string;
    description: string;
    language: string;
    license: { spdx_id: string } | null;
    stargazers_count: number;
    forks_count: number;
    updated_at: string;
    created_at: string;
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

async function fetchAllBranchCommits(since: Date): Promise<GithubCommit[]> {
  const branchesResponse = await withRetry('branches', () =>
    octokit.repos.listBranches({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      per_page: 100,
    })
  )

  const seenShas = new Set<string>()
  const allCommits: GithubCommit[] = []

  for (const branch of branchesResponse.data.slice(0, MAX_BRANCHES)) {
    let page = 1
    let hasMoreCommits = true

    while (hasMoreCommits && page <= MAX_PAGES_PER_BRANCH) {
      try {
        const commitsResponse = await withRetry(`commits ${branch.name} page ${page}`, () =>
          octokit.repos.listCommits({
            owner: GITHUB_REPO_OWNER,
            repo: GITHUB_REPO_NAME,
            sha: branch.name,
            per_page: 100,
            page,
            since: since.toISOString(),
          })
        )

        if (commitsResponse.data.length === 0) {
          hasMoreCommits = false
        } else {
          for (const commit of commitsResponse.data) {
            if (commit.sha && !seenShas.has(commit.sha)) {
              seenShas.add(commit.sha)
              allCommits.push(commit as GithubCommit)
            }
          }
          page++
          if (commitsResponse.data.length < 100) {
            hasMoreCommits = false
          }
        }
      } catch (error) {
        console.log(`Error fetching commits from ${branch.name} page ${page}:`, error)
        hasMoreCommits = false
      }
    }
  }

  return allCommits
}

function buildDailyCommitCounts(commits: GithubCommit[]): Map<string, number> {
  const dailyCommits = new Map<string, number>()

  commits.forEach((commit) => {
    const dateString =
      commit.commit?.author?.date ?? commit.commit?.committer?.date
    if (!dateString) return

    const dateKey = new Date(dateString).toISOString().split('T')[0]
    dailyCommits.set(dateKey, (dailyCommits.get(dateKey) || 0) + 1)
  })

  return dailyCommits
}

function getLatestCommitDate(commits: GithubCommit[]): string {
  if (commits.length === 0) return new Date().toISOString()

  const latestCommit = commits.reduce((latest, commit) => {
    const commitDate = new Date(
      commit.commit?.committer?.date ??
        commit.commit?.author?.date ??
        0
    )
    const latestDate = new Date(
      latest.commit?.committer?.date ??
        latest.commit?.author?.date ??
        0
    )
    return commitDate > latestDate ? commit : latest
  })

  return (
    latestCommit.commit?.committer?.date ??
    latestCommit.commit?.author?.date ??
    new Date().toISOString()
  )
}

const getCachedGithubData = unstable_cache(
  async (): Promise<GithubData> => {
    try {
      const repoResponse = await withRetry('repo data', () =>
        octokit.repos.get({
          owner: GITHUB_REPO_OWNER,
          repo: GITHUB_REPO_NAME,
        })
      )

      const repoData = repoResponse.data
      const today = new Date()
      const createdAt = new Date(repoData.created_at)
      const firstYear = createdAt.getFullYear()
      const lastYear = today.getFullYear()

      const allCommits = await fetchAllBranchCommits(createdAt)
      const dailyCommits = buildDailyCommitCounts(allCommits)
      const contributionGraph = buildContributionGraphData(
        dailyCommits,
        firstYear,
        lastYear,
        today
      )

      const githubData: GithubData = {
        repoData: {
          name: repoData.name,
          description: repoData.description || '',
          language: repoData.language || 'TypeScript',
          license: repoData.license?.spdx_id ? { spdx_id: repoData.license.spdx_id } : null,
          stargazers_count: repoData.stargazers_count,
          forks_count: repoData.forks_count,
          updated_at: repoData.updated_at,
          created_at: repoData.created_at,
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
              date: getLatestCommitDate(allCommits),
            },
          },
        },
      }
      return githubData
    } catch (error) {
      console.error('Error fetching GitHub data:', error)

      const today = new Date()
      const fallbackYear = today.getFullYear()

      return {
        repoData: {
          name: GITHUB_REPO_NAME,
          description: 'A trading analytics platform',
          language: 'TypeScript',
          license: { spdx_id: 'MIT' },
          stargazers_count: 0,
          forks_count: 0,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        githubStats: {
          repository: {
            stargazers: { totalCount: 0 },
            forks: { totalCount: 0 },
            commits: { history: { totalCount: 0 } },
          },
          contributionGraph: buildContributionGraphData(
            new Map(),
            fallbackYear,
            fallbackYear,
            today
          ),
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
  [`github-data-${GITHUB_REPO_OWNER}-${GITHUB_REPO_NAME}`],
  {
    tags: [`github-data`],
    revalidate: 3600
  }
)

export async function getGithubData(): Promise<GithubData> {
  return getCachedGithubData()
}
