import { notFound } from 'next/navigation'

// This catch-all route will handle any unmatched routes within the [locale] directory
// It immediately calls notFound() which will render the not-found.tsx page from the same directory level
export default function CatchAllPage() {
  notFound()
} 