import { Octokit } from '@octokit/rest'
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from '@/lib/github-repo'
import {
  buildContributionGraphData,
  type CodeFrequencyRecord,
  type CommitRecord,
  type ContributionGraphData,
} from '@/lib/contribution-graph'

const REQUEST_TIMEOUT_MS = 8000
const MAX_RETRIES = 2
const RETRY_BASE_DELAY_MS = 400
const MAX_PAGES_PER_BRANCH = 20
/** Integration flow: preview branches roll into beta, then main. */
const TRACKED_BRANCHES = ['main', 'beta'] as const

/** Skip slow GitHub retries while Next is generating static pages. */
const IS_PRODUCTION_BUILD = process.env.NEXT_PHASE === 'phase-production-build'

export const GITHUB_DATA_CACHE_TAG = 'github-data'

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  request: {
    timeout: REQUEST_TIMEOUT_MS,
  },
})

interface GithubCommit {
  sha: string
  author?: { login?: string | null } | null
  commit: {
    author?: { name?: string; date?: string; email?: string } | null
    committer?: { date?: string } | null
  }
}

export interface GithubData {
  repoData: {
    name: string
    description: string
    language: string
    license: { spdx_id: string } | null
    stargazers_count: number
    forks_count: number
    updated_at: string
    created_at: string
  }
  githubStats: {
    repository: {
      stargazers: { totalCount: number }
      forks: { totalCount: number }
      commits: { history: { totalCount: number } }
    }
    contributionGraph: ContributionGraphData
  }
  stars: number
  lastCommit: {
    commit: {
      committer: {
        date: string
      }
    }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isRetryableError = (error: unknown) => {
  const status =
    (error as { status?: number; response?: { status?: number } })?.status ??
    (error as { response?: { status?: number } })?.response?.status
  if (status && [429, 500, 502, 503, 504].includes(status)) return true

  const code =
    (error as { code?: string; cause?: { code?: string } })?.code ??
    (error as { cause?: { code?: string } })?.cause?.code
  return [
    'UND_ERR_SOCKET',
    'UND_ERR_CONNECT_TIMEOUT',
    'ECONNRESET',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'ECONNREFUSED',
  ].includes(code || '')
}

const withRetry = async <T>(label: string, fn: () => Promise<T>) => {
  // Production builds share a 60s per-page budget across many workers. Retries
  // against a flaky GitHub API starve static generation of unrelated routes.
  if (IS_PRODUCTION_BUILD) {
    return fn()
  }

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
        const commitsResponse = await withRetry(
          `commits ${branch} page ${page}`,
          () =>
            octokit.repos.listCommits({
              owner: GITHUB_REPO_OWNER,
              repo: GITHUB_REPO_NAME,
              sha: branch,
              per_page: 100,
              page,
              since: since.toISOString(),
            }),
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
        commit.author?.login ?? commit.commit?.author?.name ?? 'Unknown',
    })
  })

  return records
}

function buildCodeFrequencyRecords(data: unknown): CodeFrequencyRecord[] {
  if (!Array.isArray(data)) return []

  return data.flatMap((week) => {
    if (
      !Array.isArray(week) ||
      week.length < 3 ||
      typeof week[0] !== 'number' ||
      typeof week[1] !== 'number' ||
      typeof week[2] !== 'number'
    ) {
      return []
    }

    return [
      {
        weekStart: new Date(week[0] * 1000).toISOString().split('T')[0],
        additions: week[1],
        deletions: Math.abs(week[2]),
      },
    ]
  })
}

async function fetchCodeFrequency(): Promise<CodeFrequencyRecord[]> {
  try {
    const response = await withRetry('code frequency', () =>
      octokit.repos.getCodeFrequencyStats({
        owner: GITHUB_REPO_OWNER,
        repo: GITHUB_REPO_NAME,
      }),
    )

    return buildCodeFrequencyRecords(response.data)
  } catch (error) {
    console.warn('Code frequency data is temporarily unavailable:', error)
    return []
  }
}

function getLatestCommitDate(commits: GithubCommit[]): string {
  if (commits.length === 0) return new Date().toISOString()

  const latestCommit = commits.reduce((latest, commit) => {
    const commitDate = new Date(
      commit.commit?.committer?.date ?? commit.commit?.author?.date ?? 0,
    )
    const latestDate = new Date(
      latest.commit?.committer?.date ?? latest.commit?.author?.date ?? 0,
    )
    return commitDate > latestDate ? commit : latest
  })

  return (
    latestCommit.commit?.committer?.date ??
    latestCommit.commit?.author?.date ??
    new Date().toISOString()
  )
}

/**
 * Uncached GitHub network load (same role as `loadConnectionsPageDataForUser`).
 * Caching lives on the caller via `'use cache'` + `cacheLife` / `cacheTag`.
 */
export async function loadGithubData(): Promise<GithubData> {
  try {
    const [repoResponse, codeFrequency] = await Promise.all([
      withRetry('repo data', () =>
        octokit.repos.get({
          owner: GITHUB_REPO_OWNER,
          repo: GITHUB_REPO_NAME,
        }),
      ),
      fetchCodeFrequency(),
    ])

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
      today,
      codeFrequency,
    )

    return {
      repoData: {
        name: repoData.name,
        description: repoData.description || '',
        language: repoData.language || 'TypeScript',
        license: repoData.license?.spdx_id
          ? { spdx_id: repoData.license.spdx_id }
          : null,
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
    throw error
  }
}
