import React from 'react'
import Image from 'next/image'
import { Badge } from "@/components/ui/badge"

type Milestone = {
  id: number
  title: string
  description: string
  image?: string
  status: 'completed' | 'in-progress' | 'upcoming'
}

const roadmapData: Milestone[] = [
  {
    id: 1,
    title: "Core Functionality",
    description: "We've laid the foundation for Deltalytix with essential features. You can now process CSV data, view trades on a calendar, and access basic analytics. We've also implemented authentication and migrated to a robust Postgres database.",
    image: "/placeholder.svg?height=400&width=800",
    status: 'completed'
  },
  {
    id: 2,
    title: "Enhanced Data Processing",
    description: "Our latest update brings AI-assisted field mapping and support for multiple CSV formats. We've also implemented data encryption for enhanced security and improved our commission calculations for more accurate reporting.",
    status: 'completed'
  },
  {
    id: 3,
    title: "Optimization and Advanced Charts",
    description: "We're currently working on significant improvements to data management and custom fee implementations. Our new PnL daily chart provides deeper insights into your trading performance, and we're excited about the upcoming AI-powered trading session summaries.",
    image: "/placeholder.svg?height=400&width=800",
    status: 'in-progress'
  },
  {
    id: 4,
    title: "Advanced Analytics",
    description: "Coming soon: Deltalytix will offer decile statistics and trading habits analysis to give you unparalleled insights into your trading patterns. We're also working on performance sharing features and AI-powered sentiment analysis to help you understand the emotional aspects of your trading.",
    status: 'upcoming'
  },
  {
    id: 5,
    title: "Enhanced User Experience",
    description: "Our roadmap includes significant UX improvements. We're developing mobile-optimized views, implementing a dark mode for comfortable viewing in all environments, creating personalized dashboards, and improving our note-taking features to help you track your trading journey more effectively.",
    status: 'upcoming'
  }
]

export default function RoadmapBlog() {
  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Deltalytix Product Roadmap</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-12">
          We&apos;re constantly working to improve Deltalytix and provide you with the best trading analytics platform. 
          Here&apos;s a look at our recent updates and what&apos;s coming next.
        </p>
        {roadmapData.map((milestone) => (
          <div key={milestone.id} className="mb-16">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">{milestone.title}</h2>
            <Badge 
              variant={milestone.status === 'completed' ? "default" : 
                      milestone.status === 'in-progress' ? "secondary" : "outline"}
              className="mb-4"
            >
              {milestone.status === 'completed' ? "Completed" : 
               milestone.status === 'in-progress' ? "In Progress" : "Upcoming"}
            </Badge>
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
        ))}
      </div>
    </div>
  )
}