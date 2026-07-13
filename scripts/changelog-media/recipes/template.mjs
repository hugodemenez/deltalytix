/**
 * Copy this file to scripts/changelog-media/recipes/<batch>.mjs
 * and customize assets for your changelog batch.
 *
 * @type {import('../types.mjs').ChangelogMediaRecipe}
 */
export default {
  batch: 'pr-XXX',
  assets: [
    // Add only assets justified in the batch media plan.
    // An entry may have zero, one, or several assets.
    { file: 'my-feature-overview', scene: 'landing-hero' },
    { file: 'my-feature-interaction', scene: 'landing-scroll' },
  ],
}
