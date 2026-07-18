import { Suspense } from 'react'
import { connection } from 'next/server'

/**
 * Marks a route as intentionally dynamic when `generateMetadata` (or similar)
 * reads runtime APIs (`headers`, `cookies`, `searchParams`) under Cache Components.
 * The rest of the page can still prerender; metadata streams at request time.
 *
 * @see https://nextjs.org/docs/app/guides/migrating-to-cache-components#generatemetadata-and-generateviewport
 */
async function Connection() {
  await connection()
  return null
}

export function CacheComponentsDynamicMarker() {
  return (
    <Suspense fallback={null}>
      <Connection />
    </Suspense>
  )
}
