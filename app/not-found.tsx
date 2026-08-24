import { NotFoundContent } from '@/components/not-found-content'

// Rendered when `notFound()` is thrown inside a route segment. Unmatched URLs
// are handled by `app/global-not-found.tsx`, which returns a real 404 status.
export default function NotFound() {
  return <NotFoundContent />
}
