"use client"

interface EmailPreviewProps {
  html: string
  height?: string
}

export function EmailPreview({ html, height }: EmailPreviewProps) {
  const computedHeight = height ?? "640px"
  return (
    <iframe
      title="Email preview"
      srcDoc={html}
      className="h-full w-full rounded-md border"
      style={{ minHeight: computedHeight, height: computedHeight }}
      sandbox="allow-same-origin"
    />
  )
}









