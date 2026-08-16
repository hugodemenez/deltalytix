/**
 * Reply-To for weekly recap Resend payloads.
 * Same address as August PR439 broadcasts and admin newsletter/send-email.
 * Plain address — Resend accepts `local@domain` or `Name <local@domain>`.
 */
export const WEEKLY_RECAP_REPLY_TO = "hugo.demenez@deltalytix.app" // pragma: allowlist secret

/** Resend 422s anything that is not `local@domain` or `Name <local@domain>`. */
export function isValidResendReplyTo(value: string): boolean {
  if (!value.includes("@")) {
    return false
  }
  return (
    /^[^\s@<>]+@[^\s@<>]+$/.test(value) ||
    /^.+ <[^\s@<>]+@[^\s@<>]+>$/.test(value)
  )
}
