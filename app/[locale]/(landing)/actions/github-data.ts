'use server'

import { Octokit } from '@octokit/rest'
import { unstable_cache } from 'next/cache'
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from '@/lib/github-repo'
import {
  buildContributionGraphData,
  type CommitRecord,
  type ContributionGraphData,
} from '@/lib/contribution-graph'

const REQUEST_TIMEOUT_MS = 8000
const MAX_RETRIES = 2
const RETRY_BASE_DELAY_MS = 400
const MAX_PAGES_PER_BRANCH = 20
/** Integration flow: preview branches roll into beta, then main. */
const TRACKED_BRANCHES = ['main', 'beta'] as const
const WEEKLY_REVALIDATE_SECONDS = 60 * 60 * 24 * 7

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  request: {
    timeout: REQUEST_TIMEOUT_MS
  }
})

interface GithubCommit {
  sha: string
  author?: { login?: string | null } | null
  commit: {
    author?: { name?: string; date?: string; email?: string } | null
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

async function fetchTrackedBranchCommits(since: Date): Promise<GithubCommit[]> {
  const seenShas = new Set<string>()
  const allCommits: GithubCommit[] = []

  for (const branch of TRACKED_BRANCHES) {
    let page = 1
    let hasMoreCommits = true

    while (hasMoreCommits && page <= MAX_PAGES_PER_BRANCH) {
      try {
        const commitsResponse = await withRetry(`commits ${branch} page ${page}`, () =>
          octokit.repos.listCommits({
            owner: GITHUB_REPO_OWNER,
            repo: GITHUB_REPO_NAME,
            sha: branch,
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
        console.log(`Error fetching commits from ${branch} page ${page}:`, error)
        hasMoreCommits = false
      }
    }
  }

  return allCommits
}

function buildCommitRecords(commits: GithubCommit[]): CommitRecord[] {
  const records: CommitRecord[] = []

  commits.forEach((commit) => {
    const dateString =
      commit.commit?.author?.date ?? commit.commit?.committer?.date
    if (!dateString) return

    records.push({
      date: new Date(dateString).toISOString().split('T')[0],
      authorName:
        commit.author?.login ??
        commit.commit?.author?.name ??
        'Unknown',
    })
  })

  return records
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

function getWeekCacheKey(date = new Date()): string {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

async function fetchGithubData(): Promise<GithubData> {
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

    const allCommits = await fetchTrackedBranchCommits(createdAt)
    const commitRecords = buildCommitRecords(allCommits)
    const contributionGraph = buildContributionGraphData(
      commitRecords,
      firstYear,
      lastYear,
      today
    )

    return {
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
          [],
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
}

const weeklyGithubDataCache = new Map<string, () => Promise<GithubData>>()

function getWeeklyGithubDataCache(weekKey: string) {
  const existing = weeklyGithubDataCache.get(weekKey)
  if (existing) return existing

  const cached = unstable_cache(
    fetchGithubData,
    [`github-data-${GITHUB_REPO_OWNER}-${GITHUB_REPO_NAME}-${weekKey}`],
    {
      tags: [`github-data`],
      revalidate: WEEKLY_REVALIDATE_SECONDS,
    }
  )

  weeklyGithubDataCache.set(weekKey, cached)
  return cached
}

export async function getGithubData(): Promise<GithubData> {
  return getWeeklyGithubDataCache(getWeekCacheKey())()
}
