#!/usr/bin/env node
process.env.CHANGELOG_BATCH = process.env.CHANGELOG_BATCH || 'pr-249'
process.argv.push('pr-249')
await import('./capture-changelog-media.mjs')
