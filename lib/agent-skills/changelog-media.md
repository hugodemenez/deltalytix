# Changelog Media Specialist

Assess, capture, and wire localized media for Deltalytix changelog entries. Media is optional evidence, not a quota.

## Role

This is the last of three sequential roles:

1. Change reviewer: `lib/agent-skills/changelog-review.md`
2. Copywriting specialist: `lib/agent-skills/changelog-entries.md`
3. **Media specialist: this skill**

Read both `content/updates/batches/<batch>/outline.md` and the finished EN/FR MDX. Independently decide whether each entry needs **zero, one, or several** visuals.

Published changelog entries and their media wiring are immutable. Only add media to the new entries in the current outline; never revise an entry that already exists on the base branch. Existing assets may be reused by a new entry when they remain accurate, but the older MDX must stay untouched.

## Assess media needs

For every entry, ask:

- Does a visual communicate a meaningful claim faster or more clearly than copy?
- Is the important thing a location/layout, a state, a comparison, motion, or a multi-step interaction?
- Would another visual show distinct evidence, or merely repeat the first?
- Can the product state be captured honestly and cleanly in both locales?
- Is the visual still useful when viewed without the surrounding paragraph?

Use:

- **0 visuals** when text fully explains the change, the behavior is invisible/backend-only, the update is a simple command/API field, or available captures would be decorative.
- **1 visual** when one static state or short interaction tells the whole story.
- **2+ visuals** when each proves a distinct part of the story: separate surfaces, desktop/mobile behavior, before/after states, or a static overview plus essential motion.

Prefer:

- Screenshot for location, layout, or a meaningful product state.
- Short MP4 for motion, state transitions, or multi-step interactions.
- Tightly framed evidence over generic full-page screenshots.

Avoid:

- A mandatory hero image.
- Multiple images of the same state.
- Video of an otherwise static screen.
- Screenshots whose only purpose is decoration.

The review outline's `Visual moments` are candidates, not instructions or a required count. The finished copy determines which moments actually deserve proof.

## Write the media plan

Create `content/updates/batches/<batch>/media-plan.md` before changing recipes or MDX:

```md
# Changelog media plan: <batch>

## <slug>

- Decision: 0 | 1 | 2+ visuals
- Rationale: <why this count best serves the entry>
- Primary/card asset: <file and scene, or none>
- Additional assets:
  - <file, scene, exact state/action shown, claim supported>
- Omitted candidates:
  - <visual moment> — <why it would be redundant or decorative>
```

Cover every entry, including text-only entries. The rationale matters more than the count.

## Capture prerequisites

Only run capture when at least one planned asset exists.

1. Local dashboard bypass configured (see `AGENTS.md`).
2. Postgres running and schema applied: `bunx prisma db push`.
3. Demo data seeded: `bun run seed:self-host`.
4. Dev server on port 3000:

```bash
CHANGELOG_MEDIA_CAPTURE=1 bash scripts/dev.sh
```

This disables Next.js dev indicators. Capture helpers also hide `nextjs-portal`, pre-seed `cookieConsent`, and accept the consent banner.

5. Playwright Chromium: `npx playwright-core install chromium`.
6. `ffmpeg` for `.webm` → `.mp4`.

Health check:

```bash
curl -s -o /dev/null -D - http://localhost:3000/dashboard | sed -n '1,10p'
# expect: x-auth-status: authenticated
```

Screenshots default to 2× device pixel ratio. Override with `CHANGELOG_DEVICE_SCALE=3` only when needed.

## Create or update the recipe

Copy the template:

```bash
cp scripts/changelog-media/recipes/template.mjs scripts/changelog-media/recipes/pr-250.mjs
```

Only include assets justified by `media-plan.md`. One entry may use several descriptive filenames:

```js
export default {
  batch: 'pr-250',
  assets: [
    { file: 'my-feature-overview', scene: 'landing-hero' },
    { file: 'my-feature-interaction', scene: 'landing-scroll' },
  ],
}
```

If all entries have zero visuals, do not create an empty recipe and do not run capture.

### Available scenes

| Scene | Output | Use for |
|-------|--------|---------|
| `landing-hero` | `.png` | Public landing page |
| `landing-scroll` | `.mp4` | Landing page scroll demo |
| `landing-contribution-graph` | `.png` | Open-source contribution graph |
| `landing-features-carousel` | `.png` | Landing chart carousel |
| `landing-navbar-updates` | `.png` | Landing Updates dropdown |
| `landing-faq-expanded` | `.png` | Landing FAQ with one localized answer open |
| `landing-pricing-stability` | `.mp4` | Pricing period changes with stable plan cards |
| `import-mobile` | `.png` | Mobile import dialog |
| `support` | `.png` | Support assistant page |
| `trade-table-mobile` | `.png` | Compact trade table on phone |
| `trade-table-desktop` | `.png` | Desktop trade table |
| `trade-table-scroll-video` | `.mp4` | Virtualized table scrolling |
| `calendar-widgets` | `.png` | Dashboard calendar widget |
| `calendar-table` | `.png` | Calendar trade table |
| `accounts-mobile` | `.png` | Mobile accounts view |
| `accounts-table-desktop` | `.png` | Desktop accounts table |
| `widgets-mobile` | `.png` | Mobile widget carousel |
| `billing-mobile` | `.png` | Mobile payment history |

If no scene can show the planned evidence, add a narrowly named reusable scene. Document the viewport, route, locator, interaction, and expected state in code. Do not weaken the media plan to fit the existing scene catalog.

### Capture-only data

Local auth bypass may lack remote service data. Keep realistic capture mocks inside `scripts/changelog-media/`; never modify product code for screenshots.

`billing-mobile`, for example, injects localized demo invoice rows with `injectBillingPaymentHistoryMock`.

## Run capture

```bash
bun run capture:changelog-media -- pr-250
```

Outputs are localized:

```text
public/updates/pr-250/en/<asset>.png
public/updates/pr-250/fr/<asset>.png
```

Videos use `.mp4`. The script fails when a Next.js error badge or overlay is visible. Fix the underlying error and rerun; never ship captures containing dev tools, consent banners, runtime errors, or broken loading states.

## Wire media into MDX

Only add media that exists and is listed in the plan.

For a primary timeline/card asset:

```yaml
image: '/updates/pr-250/en/my-feature-overview.png'
```

For inline screenshots:

```mdx
![Specific description of the state shown](/updates/pr-250/en/my-feature-overview.png)
```

For motion:

```mdx
<video
  className="w-full rounded-lg"
  controls
  playsInline
  preload="metadata"
  poster="/updates/pr-250/en/my-feature-overview.png"
>
  <source src="/updates/pr-250/en/my-feature-interaction.mp4" type="video/mp4" />
</video>
```

Rules:

- EN files use `/updates/<batch>/en/...`; FR files use `/updates/<batch>/fr/...`.
- Localize alt text in French.
- Place each asset near the claim it supports; do not force all media to the top.
- Choose the strongest existing asset for `image:`. If none is suitable, omit `image:`.
- Text-only entries contain no placeholder paths.
- Preserve the copywriter's intended hierarchy and adjust prose only when media makes wording redundant.

## Definition of done

1. `media-plan.md` covers every outline entry with a justified 0/1/many decision.
2. Every asset demonstrates a distinct claim; omitted candidates are recorded when useful.
3. Recipe assets match the plan and capture succeeds in EN and FR.
4. Captures are clean, localized, legible, and tightly framed.
5. `image:` and body media paths point to committed files; text-only entries have no dangling paths.
6. Alt text describes the evidence shown and is localized.
7. Capture-only mocks stay under `scripts/changelog-media/`.
8. No unrelated product code changes are introduced for capture.
9. No previously published MDX or asset was replaced or rewired.

## File map

| Path | Purpose |
|------|---------|
| `content/updates/batches/<batch>/outline.md` | Reviewer handoff |
| `content/updates/batches/<batch>/media-plan.md` | Media decisions and rationale |
| `scripts/capture-changelog-media.mjs` | Capture CLI |
| `scripts/changelog-media/scenes.mjs` | Scene implementations |
| `scripts/changelog-media/recipes/<batch>.mjs` | Planned batch assets |
| `public/updates/<batch>/{en,fr}/` | Published assets |
