# Changelog Change Review

Review a Deltalytix release batch and produce the editorial outline that a copywriter and media specialist will use.

## Role

Act as a product change reviewer, not a copywriter. Read the code and product behavior closely enough to separate user-visible outcomes from implementation details.

When subagents are available, this is the first of three sequential roles:

1. **Change reviewer** — investigates the batch and writes the outline.
2. **Copywriting specialist** — turns the outline into natural EN/FR changelog entries.
3. **Media specialist** — reads the outline and finished copy, then decides whether each entry needs zero, one, or several visuals.

Do not write final MDX or capture media in this stage.

## Inputs

- A beta → main promotion PR, or `git log main..beta` plus relevant diffs.
- The oldest and newest commits in the release window.
- Recent entries under `content/updates/en/` and `content/updates/fr/`.
- Product code for any change whose visible behavior is unclear from the PR description.

## 1. Inventory the batch

Account for every meaningful change. Classify it as:

- **Include** — a trader, prop-firm user, or visitor can notice it.
- **Covered** — already explained by an existing changelog entry.
- **Skip** — CI/CD, dependencies, refactors, tests, seed data, internal tooling, or an edge-case fix already covered by an entry.

Never turn commit titles into release notes without checking the diff and visible behavior.

## 2. Group changes into entries

Group changes when they tell one coherent product story, even if several components changed. Split them when users would understand or discover them independently.

Useful grouping signals:

- Same user goal, workflow, or visual redesign.
- Same product surface and release story.
- One change exists mainly to support another.

Useful splitting signals:

- Unrelated routes, audiences, or tasks.
- Different availability, limitations, or migration impact.
- Each change deserves a distinct title and explanation.

Do not split a coherent visual polish pass into one entry per component. Do not combine unrelated fixes merely because they shipped together.

## 3. Choose metadata

- **Slug:** descriptive kebab case, shared by EN and FR.
- **`date`:** ISO date of the first commit included in the entry.
- **`completedDate`:** ISO date of the last commit included in the entry.
- **Batch id:** normally `pr-<promotion-pr-number>`.

Check that a slug does not already exist in `content/updates/`.

## 4. Write the outline

Create `content/updates/batches/<batch>/outline.md`. This is an editorial handoff, not published copy.

Use this shape, adapting sections to the batch:

```md
# Changelog outline: <batch>

## Coverage

- Included: <change or commit> → `<slug>`
- Covered: <change> → `<existing slug>`
- Skipped: <change> — <reason>

## Entry: <slug>

- User outcome: <what is observably better or newly possible>
- Audience: <who benefits>
- Surfaces: <route, screen, control, exact UI labels>
- Dates: <date> → <completedDate>
- Grouping rationale: <why these changes are one entry>
- Important details: <behavior, availability, limits, migration risk>
- Try it: <how a user can find or use it, when useful>

### Story options

- <possible narrative angle>
- <possible concise treatment>

### Visual moments

- <specific state, interaction, or comparison that could be shown>
- <another distinct visual moment, if any>

### Visual caveats

- <local data, auth, viewport, localization, or capture constraints>
```

`Visual moments` are evidence candidates, not a screenshot quota. List only moments that could help explain a claim. It is valid to write `None — the change is clearer in text`.

Do not prescribe the article structure or number of visuals. The copywriter owns structure and the media specialist owns the final media assessment.

## Handoff checks

Before handing the outline to the copywriter:

1. Every relevant commit/change is included, covered, or skipped with a reason.
2. Each entry represents one coherent user-facing story.
3. Every user-facing claim is supported by the diff or observed product behavior.
4. Routes, controls, labels, availability, and limitations are concrete when known.
5. Existing changelog coverage is acknowledged rather than duplicated.
6. Visual moments describe what would be shown and why, without forcing media.
