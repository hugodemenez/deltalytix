"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface EmailPreviewLoadingProps {
  stage: "analyzing" | "generating"
}

export function EmailPreviewLoading({ stage }: EmailPreviewLoadingProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0
        return prev + 1
      })
    }, 30)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="w-full max-w-md">
        <div className="h-7 mb-2 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.h3
              key={`title-${stage}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="text-lg font-medium text-center"
            >
              {stage === "analyzing" && "Analyzing trading data..."}
              {stage === "generating" && "Generating weekly recap..."}
            </motion.h3>
          </AnimatePresence>
        </div>

        <div className="h-10 mb-4 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={`desc-${stage}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="text-muted-foreground text-sm text-center px-4"
            >
              {stage === "analyzing" && "Crunching numbers and preparing your performance data"}
              {stage === "generating" && "Creating a beautiful email with your trading insights"}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 h-full bg-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  )
}
