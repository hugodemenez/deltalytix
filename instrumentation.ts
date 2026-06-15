export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return
  }

  const { loadEnvLocal } = await import("@/lib/load-env-local.node")
  loadEnvLocal()
}
