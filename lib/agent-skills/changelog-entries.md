# Changelog Entries

Write user-facing Deltalytix changelog MDX entries in English and French for a release batch (typically a beta → main promotion PR).

## When to use this skill

- A beta → main promotion PR is open or about to merge.
- User-facing product changes need changelog entries under `content/updates/`.
- You are preparing a `changelog/pr-<number>` branch or adding entries directly on `beta`.

## When to skip

Do **not** create entries for:

- CI/CD, GitHub Actions, or agent workflow changes
- Dependency bumps, refactors, or internal tooling with no user-visible effect
- Test-only or seed-data-only changes
- Bug fixes that only affect edge cases already covered by an existing entry

When in doubt, read recent entries in `content/updates/en/` and ask whether a trader or prop-firm user would notice the change in the product UI.

## Prerequisites

1. Identify the **batch id** — usually `pr-<promotion-pr-number>` (matches `public/updates/<batch>/` and capture recipes).
2. Gather the change set:
   - Promotion PR diff (`base` = `main`, `head` = `beta`), or
   - `git log main..beta --oneline` and per-commit / per-PR diffs for user-facing commits.
3. Read 2–3 recent entries in `content/updates/en/` for tone and length (for example `landing-page-redesign`, `billing-payment-history-mobile-layout`).

## Workflow

### 1. Inventory user-facing changes

Group the diff into **distinct product changes**. One entry per meaningful feature, UX fix, or integration improvement — not one giant release note.

Good splits:

| Change set | Entries |
|------------|---------|
| Landing redesign + navbar updates | `landing-page-redesign`, `landing-navbar-features-and-updates` |
| Mobile billing layout fix | `billing-payment-history-mobile-layout` |
| Calendar timezone bug + table alignment | `calendar-grid-day-keys-timezone-fix` (or separate if unrelated) |

### 2. Choose slugs and dates

- **Filename / slug:** `kebab-case-title.mdx` — descriptive, lowercase, hyphens only.
- **`date`:** ISO date (`YYYY-MM-DD`) of the **first** commit in the batch window (oldest change included).
- **`completedDate`:** ISO date of the **last** commit in the batch (newest change included).
- Use `git log --format=%ai -1 <sha>` on boundary commits when working from a promotion PR.

### 3. Write EN and FR MDX files

Create **paired** files:

```
content/updates/en/<slug>.mdx
content/updates/fr/<slug>.mdx
```

**Frontmatter** (both locales):

```yaml
---
title: 'Short human title'
description: 'One sentence for cards and SEO — what changed and why it matters.'
date: '2026-07-12'
status: completed
completedDate: '2026-07-12'
image: '/updates/pr-298/en/<slug>.png'
---
```

Rules:

- `title` and `description` must be **localized** in the FR file (not English pasted into FR).
- Escape apostrophes in YAML with doubled quotes: `l''historique` → use single-quoted YAML and double internal apostrophes (`d''accueil`).
- `image` uses the batch path with the correct locale subdirectory (`en` or `fr`).
- Leave `image` pointing at the expected asset path even before capture — the media skill fills in files later.

**Body structure:**

```mdx
# Same as title (H1)

![Localized alt text](/updates/<batch>/en/<slug>.png)

Two to four short paragraphs. Mention specific UI labels, routes, and behaviors.
Use **bold** for button or section names that appear in the product.
```

Content guidelines:

- **2–4 short paragraphs**; add headings or bullets only when they improve scanability.
- **Simple, conversational language** — write for traders, not engineers.
- **Human tone** — informal, direct; avoid corporate filler ("we are pleased to announce").
- **Never** use the word "programmatically".
- Lead with what was added or changed, then the benefit or use case.
- Name concrete surfaces: `/dashboard/billing`, **Import**, mobile navbar, trade table, etc.
- FR copy should be natural French, not literal word-for-word translation.

**Media placeholders:** Include at least one `![...](...)` image or `<video>` block in the body matching the paths you expect from the media skill. Use the video pattern from `faster-landing-page` when motion matters.

### 4. Capture media (next skill)

After MDX files exist, follow the **changelog media** skill:

- Discovery: `/.well-known/agent-skills/changelog-media/SKILL.md`
- Repo doc: `lib/agent-skills/changelog-media.md`

That skill covers Playwright recipes, `bun run capture:changelog-media -- <batch>`, and wiring `image:` + body assets.

### 5. Open a changelog PR

Typical git flow:

```bash
git checkout -b changelog/pr-<promotion-pr-number>
git add content/updates/
git commit -m "docs: add changelog entries for PR #<number>"
git push -u origin changelog/pr-<promotion-pr-number>
```

Open a PR into `beta` (or the promotion branch) titled `📝 Changelog entries for PR #<number>` so reviewers can merge changelog work alongside the release.

## File map

| Path | Purpose |
|------|---------|
| `content/updates/en/<slug>.mdx` | English entry |
| `content/updates/fr/<slug>.mdx` | French entry |
| `public/updates/<batch>/{en,fr}/` | Screenshots and videos (media skill) |
| `scripts/changelog-media/recipes/<batch>.mjs` | Capture recipe (media skill) |

## Examples

**PR #298 batch** (`pr-298`):

- `landing-page-redesign`
- `landing-performance-chart-carousel`
- `landing-navbar-features-and-updates`
- `billing-payment-history-mobile-layout`
- `calendar-grid-day-keys-timezone-fix`

**PR #249 batch** (`pr-249`):

- `faster-landing-page` (video demo)
- `import-from-mobile`
- `support-assistant-codebase-search`
- `trade-table-mobile-and-show-all`
- `calendar-table-timezone-date-fix`

## Definition of done

1. Every significant **user-facing** change in the batch has its own EN + FR MDX pair.
2. Frontmatter is valid YAML with `title`, `description`, `date`, `status: completed`, `completedDate`, and `image`.
3. Body has an H1, ≥1 media placeholder, and 2–4 paragraphs of product-focused copy.
4. FR entries are properly localized (not English).
5. Slugs are kebab-case and unique within `content/updates/`.
6. Changelog media skill has been run (or scheduled) so `public/updates/<batch>/` assets match MDX paths.
7. Only `content/updates/` (and later `public/updates/<batch>/` from media capture) are changed — no unrelated product code edits for changelog work.
