/**
 * pr-488 changelog media. See content/updates/batches/pr-488/media-plan.md
 * for the per-entry decisions and rationale behind this asset list.
 *
 * @type {import('../types.mjs').ChangelogMediaRecipe}
 */
export default {
  batch: 'pr-488',
  assets: [
    // futures-journal-compare-hub
    { file: 'compare-hub-journals-table', scene: 'compare-hub-journals-table' },
    { file: 'compare-tradezella-what-you-get', scene: 'compare-tradezella-what-you-get' },
    // deepcharts-csv-import
    { file: 'deepcharts-import-picker', scene: 'connections-import-picker-deepcharts' },
    // connection-account-mask-rename-delete
    { file: 'strip-standalone-account-actions', scene: 'dashboard-strip-standalone-actions' },
    { file: 'strip-standalone-delete-confirm', scene: 'dashboard-strip-standalone-delete-confirm' },
    // public-404-and-llms-txt
    { file: 'public-404-agent-resources', scene: 'public-404-agent-resources' },
  ],
}
