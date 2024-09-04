import React from 'react'
import { Calendar, Award, BarChart2, PieChart } from 'lucide-react'

const sections = [
  { id: 'accomplishments', icon: Award, label: 'Accomplishments' },
  { id: 'graphs', icon: BarChart2, label: 'Graphs' },
  // { id: 'analytics', icon: PieChart, label: 'Analytics' },
  { id: 'calendar', icon: Calendar, label: 'Calendar' },
]

interface NavigationProps {
  activeSection: string
  onSectionClick: (sectionId: string) => void
}

export function Navigation({ activeSection, onSectionClick }: NavigationProps) {
  return (
    <nav className="h-full w-64 bg-gray-100 p-4 lg:w-16">
      <ul className="space-y-6">
        {sections.map((section) => (
          <li key={section.id}>
            <button
              onClick={() => onSectionClick(section.id)}
              className={`w-full p-2 rounded flex items-center transition-colors ${
                activeSection === section.id
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <section.icon className="w-6 h-6 lg:mx-auto" />
              <span className="ml-2 lg:hidden">{section.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}