/**
 * OpenAI Apps / ChatGPT domain verification.
 * Served at /.well-known/openai-apps-challenge.
 *
 * The body must be the token only. OpenAI rejects extra whitespace.
 */
const OPENAI_APPS_CHALLENGE_TOKEN =
  "pMq3Z0R4VSscEzHBWiqgI526bED1-4Paipfi6Y94g9g";

export function GET() {
  return new Response(OPENAI_APPS_CHALLENGE_TOKEN, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
