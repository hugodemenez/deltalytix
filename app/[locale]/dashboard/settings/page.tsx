import { connection } from 'next/server'
import SettingsClient from './settings-client'

/**
 * Authenticated client UI — skip static SSR during `next build`.
 * Without this, Cache Components tries to prerender the large client tree and
 * can exceed Vercel's 60s per-page static-generation budget under load.
 */
export default async function SettingsPage() {
  await connection()
  return <SettingsClient />
}
