'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Badge } from "@/components/ui/badge"
import CompletedTimeline from '@/components/completed-timeline'

type Milestone = {
  id: number
  title: string
  description: string
  image?: string
  status: 'completed' | 'in-progress' | 'upcoming'
  estimatedDate?: string
  completedDate?: string
}

const roadmapData: Milestone[] = [
  {
    id: 1,
    title: "Core Functionality",
    description: "We've laid the foundation for Deltalytix with essential features. You can now process CSV data, view trades on a calendar, and access basic analytics. We've also implemented authentication and migrated to a robust Postgres database.",
    status: 'completed',
    completedDate: "2024-08-30"
  },
  {
    id: 2,
    title: "Enhanced Data Processing",
    description: "Our latest update brings AI-assisted field mapping and support for multiple CSV formats, including Tradovate and Rithmic. We've also implemented data encryption for enhanced security and improved our commission calculations for more accurate reporting.",
    status: 'completed',
    completedDate: "2024-09-09"
  },
  {
    id: 3,
    title: "Advanced Dashboard Charts",
    description: "We've added new insightful charts to help you analyze your trading performance more effectively. The Weekday PnL Chart allows you to identify which days of the week yield the best results, while the Time of Day PnL Chart helps you pinpoint your most profitable trading hours.",
    status: 'completed',
    completedDate: "2024-09-27"
  },
  {
    id: 4,
    title: "Enhanced Calendar View",
    description: "Our calendar feature now includes weekly and monthly PnL views, giving you a broader perspective on your trading performance over different time frames. This update helps you identify patterns and trends in your trading results more easily.",
    status: 'completed',
    completedDate: "2024-09-23"
  },
  {
    id: 5,
    title: "Subscription Plans",
    description: "We've introduced flexible subscription options to cater to different trader needs. Choose from Basic to Premium plans, available in both monthly and yearly subscriptions. Each tier offers a unique set of features to support your trading journey.",
    status: 'completed',
    completedDate: "2024-09-23"
  },
  {
    id: 6,
    title: "Dark Mode",
    description: "We've implemented a dark mode option, allowing users to comfortably use Deltalytix in low-light environments and reducing eye strain during extended analysis sessions.",
    status: 'completed',
    completedDate: "2024-09-16"
  },
  {
    id: 7,
    title: "Mobile Optimization and Data Management",
    description: "We're actively working on improving the mobile view for a seamless experience across devices. Additionally, we're enhancing imported data management with features like sorting and the ability to move trades to separate accounts. To assist users, we're also creating comprehensive import tutorials.",
    status: 'in-progress'
  },
  {
    id: 8,
    title: "Automatic Import from Rithmic",
    description: "We're collaborating closely with Rithmic to implement automatic data import, streamlining the process of getting your trading data into Deltalytix.",
    status: 'upcoming',
    estimatedDate: "In 3 weeks"
  },
  {
    id: 9,
    title: "Import from Interactive Broker and AMP",
    description: "We're expanding our import capabilities to include support for Interactive Broker and AMP, giving you more flexibility in how you bring your trading data into Deltalytix.",
    status: 'upcoming',
    estimatedDate: "In 2 weeks"
  },
  {
    id: 10,
    title: "AI-Powered Mentoring Chat",
    description: "We're developing an AI-powered chat feature to provide personalized mentoring and insights based on your trading data and patterns.",
    status: 'upcoming',
    estimatedDate: "In 4 weeks"
  },
  {
    id: 11,
    title: "Advanced Quantitative Analysis",
    description: "Our upcoming feature will allow you to identify which indicators are most correlated to your PnL, providing deeper insights into your trading strategies and performance.",
    status: 'upcoming',
    estimatedDate: "In 5 weeks"
  }
]

function sortByEstimatedDate(a: Milestone, b: Milestone) {
  if (!a.estimatedDate) return 1
  if (!b.estimatedDate) return -1
  return a.estimatedDate.localeCompare(b.estimatedDate)
}

export default function RoadmapBlog() {
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null)

  const upcomingFeatures = roadmapData
    .filter(milestone => milestone.status === 'upcoming')
    .sort(sortByEstimatedDate)

  const inProgressFeatures = roadmapData.filter(milestone => milestone.status === 'in-progress')
  const completedFeatures = roadmapData.filter(milestone => milestone.status === 'completed')

  return (
    <div className="min-h-screen ">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Deltalytix Product Roadmap</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-12">
          We&apos;re constantly working to improve Deltalytix and provide you with the best trading analytics platform. 
          Here&apos;s a look at our current progress, upcoming features, and recent updates.
        </p>

        <h2 className="text-2xl font-semibold mt-12 mb-6 text-gray-800 dark:text-gray-200">In Progress</h2>
        {inProgressFeatures.map((milestone) => (
          <MilestoneCard key={milestone.id} milestone={milestone} />
        ))}

        <h2 className="text-2xl font-semibold mt-12 mb-6 text-gray-800 dark:text-gray-200">Upcoming Features</h2>
        {upcomingFeatures.map((milestone) => (
          <MilestoneCard key={milestone.id} milestone={milestone} />
        ))}


        <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Completed Features</h2>
        <CompletedTimeline milestones={completedFeatures} />
      </div>
    </div>
  )
}

function MilestoneCard({ milestone }: { milestone: Milestone }) {
  return (
    <div className="mb-16">
      <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">{milestone.title}</h3>
      <div className="flex items-center gap-2 mb-4">
        <Badge 
          variant={milestone.status === 'in-progress' ? "secondary" : "outline"}
          className="flex items-center"
        >
          {milestone.status === 'in-progress' && (
            <span className="relative flex h-3 w-3 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          )}
          {milestone.status === 'in-progress' ? "In Progress" : "Upcoming"}
        </Badge>
        {milestone.estimatedDate && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {milestone.estimatedDate}
          </span>
        )}
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">{milestone.description}</p>
      {milestone.image && (
        <div className="rounded-lg overflow-hidden mb-6 bg-gray-100 dark:bg-gray-800">
          <Image
            src={milestone.image}
            alt={`${milestone.title} preview`}
            width={800}
            height={400}
            className="w-full h-auto"
          />
        </div>
      )}
    </div>
  )
}