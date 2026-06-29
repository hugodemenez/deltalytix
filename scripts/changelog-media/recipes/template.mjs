/**
 * Copy this file to scripts/changelog-media/recipes/<batch>.mjs
 * and customize assets for your changelog batch.
 *
 * @type {import('../types.mjs').ChangelogMediaRecipe}
 */
export default {
  batch: 'pr-XXX',
  assets: [
    // Screenshots
    { file: 'my-feature', scene: 'landing-hero' },
    { file: 'my-dashboard-feature', scene: 'trade-table-desktop' },
    // Videos
    { file: 'my-feature-demo', scene: 'landing-scroll' },
  ],
}
