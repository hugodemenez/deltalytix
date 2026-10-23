import { connection } from "next/server"
import DevelopersClient from "./developers-client"
import { listOwnedOAuthAppsAction } from "../settings/connections-actions"

/**
 * Developers: OAuth apps this user registered (create, edit, rotate the
 * secret, delete). Traders' own connections and API tokens stay in
 * Settings → Connections; the API docs link here.
 */
export default async function DevelopersPage() {
  await connection()
  const ownedApps = await listOwnedOAuthAppsAction()
  return <DevelopersClient initialOwnedApps={ownedApps} />
}
