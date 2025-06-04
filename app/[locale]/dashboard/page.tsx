'use client'

import WidgetCanvas from './components/widget-canvas'

export default function Home() {
  return (
    <main className="flex w-full min-h-screen py-6 lg:py-8 overflow-x-hidden">
      <WidgetCanvas />
    </main>
  )
}