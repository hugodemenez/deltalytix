# Changelog Copywriting

Write user-facing Deltalytix changelog MDX in English and French from a reviewed release outline.

## Role

Act as a product copywriting specialist. Use editorial judgment: a tiny fix may need one sentence, related improvements may scan best as bullets, and a significant workflow may deserve a short narrative with sections.

This is the second of three sequential roles:

1. Change reviewer: `lib/agent-skills/changelog-review.md`
2. **Copywriting specialist: this skill**
3. Media specialist: `lib/agent-skills/changelog-media.md`

When subagents are available, give each role to a separate agent so the copywriter does not merely restate its own review.

## Prerequisites

1. Read `content/updates/batches/<batch>/outline.md`.
2. Verify the outline covers the intended release diff.
3. Read 2–3 recent entries for Deltalytix voice, but do not copy their structure.
4. Read the relevant product code when a label, route, behavior, or limitation remains uncertain.

If the outline groups unrelated changes, duplicates an existing entry, or contains an unsupported claim, return it to the reviewer before drafting.

Changelog entries are append-only. Never edit an EN/FR entry that already exists on the base branch. If the outline requests an update to a published slug, reject the handoff: the reviewer must either define a new follow-up entry or mark the change covered/skipped.

## Editorial model

Take inspiration from the strengths of excellent technology changelogs without imitating one fixed house style:

- **Linear:** group related changes into a coherent product story and use crisp, specific visuals.
- **Notion:** lead with what users can now do and use warm, plain language.
- **Stripe and Vercel:** be precise about behavior, controls, availability, limits, and next steps.

Deltalytix writes for traders and prop-firm users. Prefer product clarity over launch hype or engineering detail.

## Write for the reader's questions

The entry should make it easy to answer:

1. Does this affect me?
2. What changed or became possible?
3. Where do I find it?
4. Why is it useful?
5. Are there limits, rollout details, changed defaults, or migration steps?

Not every entry needs to answer all five. Match the treatment to the change.

## Choose the structure by taste and impact

There is no required paragraph count or body template. Choose the shortest structure that tells the story well.

Possible treatments include:

- **Small fix:** H1 and 1–3 direct sentences.
- **Focused improvement:** short lead followed by one explanatory paragraph.
- **Related changes:** short introduction plus bullets or brief sections.
- **Significant workflow:** narrative overview, scannable headings, examples, and availability.
- **Breaking or migration change:** explicit sections such as **What changed**, **Impact**, **Compatibility**, and **What to do**.
- **Retirement:** direct explanation, date, impact, and alternative.

Media may appear before or after the relevant copy, or not at all. Do not insert a hero image just because previous entries have one.

## Copy principles

- Lead with the observable outcome, not the implementation.
- Name exact screens, routes, controls, commands, API fields, and UI labels.
- Connect capability to consequence: “X now does Y, so you can Z.”
- Use one credible benefit per claim; do not repeat it in different words.
- State availability, plan restrictions, defaults, limitations, and migration risk when relevant.
- Include a direct next step when users can try or configure the change.
- Make next steps clickable. Use localized Markdown links such as `[Explore the redesigned homepage](/en)` and `[Découvrir la page repensée](/fr)` instead of bare route text.
- Use internal relative links for Deltalytix pages and descriptive link text; never use “click here.”
- Preserve useful technical detail for developer-facing changes, but explain its effect.
- Never invent metrics, user demand, rollout status, or benefits.

Avoid:

- “We are pleased/thrilled to announce…”
- Vague titles such as “Exciting improvements” or “A better experience.”
- Unqualified claims such as “faster,” “seamless,” or “powerful.”
- PR summaries, ticket lists, implementation trivia, and repeated conclusions.
- The word “programmatically.”

## Create paired EN and FR files

For every outline entry, create:

```text
content/updates/en/<slug>.mdx
content/updates/fr/<slug>.mdx
```

Both files must be new. Check the base branch before writing and never overwrite an existing slug.

Use shared dates and slug:

```yaml
---
title: 'Short human title'
description: 'One specific sentence for cards and SEO.'
date: '2026-07-12'
status: completed
completedDate: '2026-07-12'
---
```

Rules:

- Localize title, description, body, headings, and alt text naturally in French.
- Do not translate English word-for-word when natural French uses a different construction.
- With single-quoted YAML, escape apostrophes by doubling them: `d''accueil`.
- Use the outline's commit dates, not the drafting date.
- Use **bold** for controls or section names when it improves scanning.

## Media handoff

The media specialist decides whether an entry needs **zero, one, or several** screenshots/videos after reading both the outline and final copy.

- Do not create placeholder image paths to satisfy a quota.
- Do not add `image:` frontmatter unless the referenced asset exists or the media specialist has committed to its exact path.
- If a visual would clarify a specific sentence, leave that sentence concrete enough for the media specialist to illustrate.
- The final structure may be adjusted when media is wired in, but the media specialist must preserve the copy's narrative.

## Quality review

Before handing entries to the media specialist:

1. Every outline entry has matching EN and FR MDX.
2. Every MDX pair is newly added; no published entry was modified.
3. Titles describe a capability or outcome rather than advertising it.
4. Copy is faithful to the outline and diff, with no unsupported claims.
5. Length and structure fit the importance and complexity of the change.
6. Concrete surfaces and labels replace generic phrases where useful.
7. Actionable Deltalytix destinations use descriptive localized links, not bare paths.
8. French reads naturally and carries the same facts, not necessarily the same syntax.
9. Frontmatter is valid and contains no dangling media path.
10. No paragraph, heading, or bullet exists only to satisfy a template.

## File map

| Path | Purpose |
|------|---------|
| `content/updates/batches/<batch>/outline.md` | Reviewed source for copy and media |
| `content/updates/en/<slug>.mdx` | English entry |
| `content/updates/fr/<slug>.mdx` | French entry |
| `lib/agent-skills/changelog-review.md` | Previous role |
| `lib/agent-skills/changelog-media.md` | Next role |
