import "@/lib/load-env-local"

export async function register() {
  // Ensures .env.local overrides injected cloud DATABASE_URL before server modules load.
}
