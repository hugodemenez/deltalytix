import { writeFileSync } from "node:fs"
import { loadEnvLocal } from "../lib/load-env-local.node"
import { prisma } from "../lib/prisma"
import { API_SCOPES } from "../lib/api/scopes"
import {
  generatePersonalAccessToken,
  sha256,
} from "../lib/api/tokens"

loadEnvLocal()

const userId =
  process.env.LOCAL_DASHBOARD_USER_ID ||
  process.env.NEXT_PUBLIC_LOCAL_DASHBOARD_USER_ID ||
  "local-dashboard-user"

const limited = process.argv.includes("--limited")
const outIdx = process.argv.indexOf("--out")
const outPath = outIdx >= 0 ? process.argv[outIdx + 1] : null
const name = limited ? "e2e-limited-pat" : "e2e-full-pat"
const scopes = limited ? ["profile:read"] : [...API_SCOPES]

async function main() {
  const user = await prisma.user.findFirst({
    where: { OR: [{ id: userId }, { auth_user_id: userId }] },
  })

  if (!user) {
    process.stderr.write(`User not found: ${userId}\n`)
    process.exit(1)
  }

  const token = generatePersonalAccessToken()
  const record = await prisma.oAuthAccessToken.create({
    data: {
      name,
      tokenHash: sha256(token),
      userId: user.id,
      scopes,
      appId: null,
      expiresAt: null,
    },
  })

  const payload = {
    token,
    tokenId: record.id,
    userId: user.id,
    scopes,
    name,
  }

  const serialized = `${JSON.stringify(payload, null, 2)}\n`
  if (outPath) {
    writeFileSync(outPath, serialized)
  }
  // Prefix makes it easy to extract amid dotenv tip noise on stdout.
  process.stdout.write(`API_TOKEN_JSON=${JSON.stringify(payload)}\n`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
