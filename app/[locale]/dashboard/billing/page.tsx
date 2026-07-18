import { connection } from 'next/server'
import BillingClient from './billing-client'

/** Authenticated client UI — skip static SSR during `next build`. */
export default async function BillingPage() {
  await connection()
  return <BillingClient />
}
