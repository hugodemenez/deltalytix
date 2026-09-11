/**
 * pr-498 changelog media. See content/updates/batches/pr-498/media-plan.md
 * for the per-entry decisions and rationale behind this asset list.
 *
 * @type {import('../types.mjs').ChangelogMediaRecipe}
 */
export default {
  batch: 'pr-498',
  assets: [
    // calendar-month-year-and-news-filter
    { file: 'calendar-header-month-year-news', scene: 'calendar-header-month-year-news' },
    // dashboard-centered-view-tabs
    { file: 'dashboard-centered-view-tabs', scene: 'dashboard-centered-view-tabs' },
    // Email still for Back to Work mail (not a changelog-entry visual)
    { file: 'dashboard-home-email', scene: 'dashboard-home-email' },
    // rithmic-protocol-rms-commissions — 0 visuals
    // plus-back-to-work-checkout-promo — 0 visuals
  ],
}
