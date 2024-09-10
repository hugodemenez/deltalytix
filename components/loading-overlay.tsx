import React from 'react'
import { Loader2 } from 'lucide-react'

export default function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="text-center flex flex-col items-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Loading your trades...</p>
      </div>
    </div>
  )
}