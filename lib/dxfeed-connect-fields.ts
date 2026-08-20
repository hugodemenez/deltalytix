export type DxFeedConnectField = 'username' | 'password'

/**
 * Client-side required-field checks for DxFeed connect.
 * Logins may be an email or a non-email username, so there is no format check.
 */
export function getDxFeedConnectFieldErrors(input: {
  username: string
  password: string
}): DxFeedConnectField[] {
  const errors: DxFeedConnectField[] = []
  if (!input.username.trim()) errors.push('username')
  if (!input.password) errors.push('password')
  return errors
}
