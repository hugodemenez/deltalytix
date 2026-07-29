import { connection } from 'next/server'
import ImportClient from './import-client'

/** Authenticated client UI — skip static SSR during `next build`. */
export default async function ImportPage() {
  await connection()
  return <ImportClient />
}