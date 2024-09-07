'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { GitBranchIcon, UsersIcon, BookOpenIcon, ShieldCheckIcon, StarIcon, GitForkIcon } from 'lucide-react'
import { MdOutlineBrightness1, MdBalance, MdOutlineAdjust } from 'react-icons/md'
import { LuGitFork } from 'react-icons/lu'
import { fetchGithubStars, getGithubStats } from '@/server/github'
import { ChartSSR } from './chart-ssr'
import Link from 'next/link'

const REPO_OWNER = process.env.NEXT_PUBLIC_REPO_OWNER || 'default_owner'
const REPO_NAME = process.env.NEXT_PUBLIC_REPO_NAME || 'default_repo'

interface RepoData {
  name: string;
  description: string;
  language: string;
  license: { spdx_id: string } | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
}

interface GithubStats {
  repository: {
    stargazers: { totalCount: number };
    forks: { totalCount: number };
    commits: { history: { totalCount: number } };
  };
  stats: { value: number; date: Date }[];
}

export default function GitHubRepoCard() {
  const [repoData, setRepoData] = useState<RepoData | null>(null)
  const [githubStats, setGithubStats] = useState<GithubStats | null>(null)
  const [starCount, setStarCount] = useState<number>(0)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  useEffect(() => {
    async function fetchData() {
      try {
        const [repoResponse, statsResponse, starsResponse] = await Promise.all([
          fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`),
          getGithubStats(),
          fetchGithubStars()
        ])
        const repoData = await repoResponse.json()
        setRepoData(repoData)
        setGithubStats(statsResponse)
        setStarCount(starsResponse.stargazers_count)
        setLastUpdated(new Date().toISOString())
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
    const intervalId = setInterval(fetchData, 3600000) // Update every hour

    return () => clearInterval(intervalId)
  }, [])

  if (!repoData || !githubStats) return <div className="text-center p-4">Loading...</div>

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    return `${seconds} second${seconds !== 1 ? 's' : ''} ago`
  }

  return (
    <div className=" px-4 mb-16 md:mb-32">
      <div className="mb-12">
        <h2 className="text-3xl md:text-4xl mb-4 font-medium text-primary">Open startup</h2>
        <p className="text-muted-foreground max-w-[500px]">
          We believe in being as transparent as possible, from <a href={`https://github.com/${REPO_OWNER}/${REPO_NAME}`} target="_blank" rel="noreferrer" className="underline">code</a> to metrics. You can also request a feature and vote on which ones we should prioritize.
        </p>
      </div>
      <Card className="border border-border bg-background p-4 md:p-8 lg:p-10">
        <div className="flex flex-col lg:flex-row lg:space-x-16">
          <div className="lg:basis-1/2 mb-8 lg:mb-0">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="open-source">
                <AccordionTrigger className="flex items-center justify-between text-primary">
                  <div className="flex items-center space-x-2">
                    <GitBranchIcon className="h-6 w-6 md:h-8 md:w-8" />
                    <span className="text-base md:text-lg">Open source</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  <p>All of our code is fully open source: clone, fork and contribute to {repoData.name}.</p>
                  <Button variant="outline" className="mt-4 mb-2 border-primary text-primary">
                    View repository
                  </Button>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="community">
                <AccordionTrigger className="flex items-center justify-between text-primary">
                  <div className="flex items-center space-x-2">
                    <UsersIcon className="h-6 w-6 md:h-8 md:w-8" />
                    <span className="text-base md:text-lg">Community</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  <p>Join a community of traders passionate about algorithmic trading and financial analysis.</p>
                  <Button variant="outline" className="mt-4 mb-2 border-primary text-primary">
                    <a href={process.env.NEXT_PUBLIC_DISCORD_INVITATION} target="_blank" rel="noreferrer">
                      Join Community
                    </a>
                  </Button>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="open-roadmap">
                <AccordionTrigger className="flex items-center justify-between text-primary">
                  <div className="flex items-center space-x-2">
                    <BookOpenIcon className="h-6 w-6 md:h-8 md:w-8" />
                    <span className="text-base md:text-lg">Open roadmap</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  <p>Missing a feature? Start a discussion, report an issue, contribute the code, or even fork the repository.</p>
                  <Button variant="outline" className="mt-4 mb-2 border-primary text-primary">
                    <Link href="/updates">View Updates</Link>
                  </Button>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="security">
                <AccordionTrigger className="flex items-center justify-between text-primary">
                  <div className="flex items-center space-x-2">
                    <ShieldCheckIcon className="h-6 w-6 md:h-8 md:w-8" />
                    <span className="text-base md:text-lg">Security</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  <p>We take security seriously. Learn about our security measures and how to report vulnerabilities.</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <div className="lg:basis-1/2">
            <Card className="w-full h-full border border-border bg-card p-4 md:p-6 lg:p-8">
              <CardHeader className="border-b border-border pb-4 mb-4">
                <CardTitle className="font-medium text-lg md:text-xl lg:text-2xl text-primary">{repoData.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className="text-muted-foreground">{repoData.language}</Badge>
                  {repoData.license && <Badge variant="outline" className="text-muted-foreground">{repoData.license.spdx_id}</Badge>}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center space-x-1">
                    <MdOutlineBrightness1 />
                    <span>{repoData.language}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MdBalance />
                    <span>{repoData.license?.spdx_id || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <StarIcon className="w-3 h-3" />
                    <span>
                      {Intl.NumberFormat("en", {
                        notation: "compact",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 1,
                      }).format(githubStats.repository.stargazers.totalCount)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <LuGitFork />
                    <span>
                      {Intl.NumberFormat("en", {
                        notation: "compact",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 1,
                      }).format(githubStats.repository.forks.totalCount)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MdOutlineAdjust />
                    <span>
                      {Intl.NumberFormat("en", {
                        notation: "compact",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 1,
                      }).format(githubStats.repository.commits.history.totalCount)}
                    </span>
                  </div>
                </div>
                <div className="pb-10 mt-10 h-[130px]">
                  <ChartSSR data={githubStats.stats} />
                  <p className="text-muted-foreground text-sm mt-4">
                    Updated {formatTimeAgo(lastUpdated)}
                  </p>
                </div>
                <a
                  href={`https://github.com/${REPO_OWNER}/${REPO_NAME}`}
                  className="border border-border flex justify-center h-8 leading-[30px] text-muted-foreground mt-4"
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="bg-background pl-2 pr-3 text-[14px] flex items-center space-x-2 border-r-[1px] border-border">
                    <StarIcon className="w-4 h-4" />
                    <span className="font-medium">Star</span>
                  </div>
                  <div className="px-4 text-[14px]">
                    {Intl.NumberFormat("en", {
                      notation: "compact",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 1,
                    }).format(starCount)}
                  </div>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  )
}