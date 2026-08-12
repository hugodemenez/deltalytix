/**
 * IG session `identifier` constraint (v2 / v3):
 * Pattern(regexp="[A-Za-z0-9\\-_]{1,30}")
 *
 * The web platform accepts email logins; the REST API does not. An address
 * with `@` fails validation as `validation.pattern.invalid.authenticationRequest.identifier`
 * before IG even checks the password.
 */
export const IG_IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{1,30}$/;

export function isValidIgIdentifier(identifier: string): boolean {
  return IG_IDENTIFIER_PATTERN.test(identifier);
}
