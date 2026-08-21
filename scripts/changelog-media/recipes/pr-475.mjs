/**
 * pr-475 changelog media. See content/updates/batches/pr-475/media-plan.md
 * for the per-entry decisions and rationale behind this asset list.
 *
 * @type {import('../types.mjs').ChangelogMediaRecipe}
 */
export default {
  batch: 'pr-475',
  assets: [
    // dashboard-v5-shell
    { file: 'dashboard-shell-home', scene: 'dashboard-shell-home' },
    { file: 'dashboard-shell-filters', scene: 'dashboard-shell-filters' },
    // settings-v2-account-page
    { file: 'settings-account-list', scene: 'settings-account-list' },
    // dxfeed-login-detects-prop-firm
    { file: 'dxfeed-single-step-form', scene: 'dxfeed-single-step-form' },
    // en-trading-journal-positioning (EN only — see media-plan.md; the FR
    // capture that this scene also produces should stay unused/unwired)
    { file: 'en-hero-trading-journal', scene: 'landing-hero' },
  ],
}
