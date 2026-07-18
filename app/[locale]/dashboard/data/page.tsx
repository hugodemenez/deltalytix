import { connection } from 'next/server'
import DataClient from './data-client'

/** Authenticated client UI — skip static SSR during `next build`. */
export default async function DataPage() {
  await connection()
  return <DataClient />
}
