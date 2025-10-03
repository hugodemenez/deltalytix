'use server'

import { Octokit } from '@octokit/rest'

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
})

const REPO_OWNER = 'hugodemenez'
const REPO_NAME = 'deltalytix'

export async function getGithubStats() {
  try {
    const [repoData, commitsData] = await Promise.all([
      octokit.repos.get({
        owner: REPO_OWNER,
        repo: REPO_NAME,
      }),
      octokit.repos.getCommitActivityStats({
        owner: REPO_OWNER,
        repo: REPO_NAME,
      }),
    ])

    // Handle the case where commitsData.data is {}
    if (Object.keys(commitsData.data).length === 0) {
      return null
    }
    const stats = commitsData.data.slice(-12).map((week) => ({
      value: week.total,
      date: new Date(week.week * 1000),
    }))

    return {
      repository: {
        stargazers: { totalCount: repoData.data.stargazers_count },
        forks: { totalCount: repoData.data.forks_count },
        commits: { history: { totalCount: repoData.data.size } }, // Note: This uses default branch only
      },
      stats,
    }
  } catch (error) {
    console.error('Error fetching GitHub stats:', error)
    return null
  }
}

export async function fetchGithubStars() {
  try {
    const { data } = await octokit.repos.get({
      owner: REPO_OWNER,
      repo: REPO_NAME,
    })

    return {
      stargazers_count: data.stargazers_count,
    }
  } catch (error) {
    console.error('Error fetching GitHub stars:', error)
    return { stargazers_count: 0 }
  }
}