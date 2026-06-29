# Changelog Media Capture

Capture localized screenshots and short demo videos for Deltalytix changelog (`content/updates`) entries.

## When to use this skill

- A new changelog batch was created (for example from a beta → main PR).
- Changelog MDX entries need at least one screenshot or video in the body.
- Assets must be served from `public/updates/<batch>/`.

## Prerequisites

1. Local env with dashboard bypass (see repo `AGENTS.md`).
2. Postgres running and schema applied: `bunx prisma db push`
3. Demo data seeded: `bun run seed:self-host`
4. Dev server on port 3000: `bash scripts/dev.sh`
5. Playwright Chromium available: `npx playwright-core install chromium`
6. `ffmpeg` installed (for `.webm` → `.mp4` conversion)

Health check:

```bash
curl -s -o /dev/null -D - http://localhost:3000/dashboard | sed -n '1,10p'
# expect: x-auth-status: authenticated
```

## Workflow

### 1. Create or update the capture recipe

Copy the template and name it after your batch:

```bash
cp scripts/changelog-media/recipes/template.mjs scripts/changelog-media/recipes/pr-250.mjs
```

Edit `scripts/changelog-media/recipes/pr-250.mjs`:

```js
export default {
  batch: 'pr-250',
  assets: [
    { file: 'my-feature-hero', scene: 'landing-hero' },
    { file: 'my-feature-demo', scene: 'landing-scroll' },
    { file: 'my-dashboard-change', scene: 'trade-table-desktop' },
  ],
}
```

Available scenes:

| Scene | Output | Use for |
|-------|--------|---------|
| `landing-hero` | `.png` | Public landing page |
| `landing-scroll` | `.mp4` | Landing page scroll demo |
| `import-mobile` | `.png` | Mobile import dialog |
| `support` | `.png` | Support assistant page |
| `trade-table-mobile` | `.png` | Compact trade table on phone |
| `trade-table-desktop` | `.png` | Desktop trade table (Show All) |
| `trade-table-scroll-video` | `.mp4` | Virtualized table scroll demo |
| `calendar-widgets` | `.png` | Calendar widget on dashboard |
| `calendar-table` | `.png` | Trade table tab for date alignment |

Asset filenames should match the changelog slug (or a descriptive suffix like `-mobile`, `-demo`).

### 2. Run the capture script

```bash
CHANGELOG_BATCH=pr-250 node scripts/capture-changelog-media.mjs
# or
bun run capture:changelog-media -- pr-250
```

Outputs:

```
public/updates/pr-250/en/<asset>.png
public/updates/pr-250/en/<asset>.mp4
public/updates/pr-250/fr/<asset>.png
public/updates/pr-250/fr/<asset>.mp4
```

The script captures **both EN and FR** with localized UI labels and Playwright locale (`en-US` / `fr-FR`).

### 3. Wire media into MDX

For each changelog entry, update **both** `content/updates/en/<slug>.mdx` and `content/updates/fr/<slug>.mdx`.

**Frontmatter** (timeline card image):

```yaml
image: '/updates/pr-250/<locale>/my-feature-hero.png'
```

**Body** (at least one screenshot or video):

```mdx
![Short alt text](/updates/pr-250/en/my-feature-hero.png)
```

```mdx
<video
  className="w-full rounded-lg"
  controls
  playsInline
  preload="metadata"
  poster="/updates/pr-250/en/my-feature-hero.png"
>
  <source src="/updates/pr-250/en/my-feature-demo.mp4" type="video/mp4" />
</video>
```

Rules:

- EN files use `/updates/<batch>/en/...`
- FR files use `/updates/<batch>/fr/...`
- Alt text should be localized in FR MDX files
- Prefer screenshots for static UI; use short `.mp4` demos for motion (scroll, virtualization)

### 4. Verify captures are clean

The capture script fails if a Next.js dev error badge (`1 Issue`) is visible. If capture fails:

1. Open the page in the browser and check the dev overlay.
2. Fix hydration mismatches (never read `window` / `document` during render).
3. Re-run the capture script.

Do **not** ship screenshots that include the red Next.js dev indicator.

## File map

| Path | Purpose |
|------|---------|
| `scripts/capture-changelog-media.mjs` | CLI entrypoint |
| `scripts/changelog-media/constants.mjs` | Locales + UI label patterns |
| `scripts/changelog-media/helpers.mjs` | Playwright helpers |
| `scripts/changelog-media/scenes.mjs` | Scene implementations |
| `scripts/changelog-media/recipes/<batch>.mjs` | Per-PR capture recipe |
| `public/updates/<batch>/{en,fr}/` | Published assets |

## Example: PR #249

Recipe: `scripts/changelog-media/recipes/pr-249.mjs`

```bash
bun run capture:changelog-media -- pr-249
```

Entries wired in:

- `faster-landing-page`
- `import-from-mobile`
- `support-assistant-codebase-search`
- `trade-table-mobile-and-show-all`
- `calendar-table-timezone-date-fix`

## Definition of done

1. Recipe exists for the batch.
2. `bun run capture:changelog-media -- <batch>` completes with no dev overlay errors.
3. Each new EN/FR MDX entry has `image:` in frontmatter and ≥1 media element in the body.
4. Media paths use the correct locale subdirectory (`en` or `fr`).
5. Assets are committed under `public/updates/<batch>/`.
