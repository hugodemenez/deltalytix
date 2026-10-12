/**
 * Hiding an account in the dashboard moves it into this group. It is a plain
 * `Group` row matched by name, so anything outside the dashboard (the public
 * API) has to use the same name to tell hidden accounts apart.
 */
export const HIDDEN_GROUP_NAME = "Hidden Accounts"
