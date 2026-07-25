# Shared agent skills

This is Deltalytix's canonical cross-agent skill directory. Keep each skill in `agents/skills/<name>/` with a `SKILL.md` entry point, and point every coding agent here instead of maintaining `.cursor`, `.claude`, or `.codex` copies.

## Deltalytix workflows

- [`changelog-review`](./changelog-review/SKILL.md): review a release diff and prepare the editorial outline.
- [`changelog-entries`](./changelog-entries/SKILL.md): write paired English and French changelog entries.
- [`changelog-media`](./changelog-media/SKILL.md): plan, capture, and wire localized release media.

## Interface skills

- [`better-interface`](./better-interface/SKILL.md): coordinate a holistic interface review.
- [`better-accessibility`](./better-accessibility/SKILL.md): review semantics, keyboard behavior, forms, assistive technology, and accessibility requirements.
- [`better-colors`](./better-colors/SKILL.md): review palettes, color usage, gamut, and contrast remediation.
- [`better-layout`](./better-layout/SKILL.md): review grouping, alignment, spacing, responsive structure, and reading order.
- [`better-typography`](./better-typography/SKILL.md): review font selection, type systems, text rendering, and wrapping.
- [`better-ui`](./better-ui/SKILL.md): review surfaces, icons, motion, and interface polish.
- [`better-writing`](./better-writing/SKILL.md): review interface copy, terminology, labels, errors, and empty states.

The `better-*` collection is vendored without content changes from [`jakubkrehel/skills`](https://github.com/jakubkrehel/skills) at commit [`79a09456be60419e652e63fc9e057b5587d051ea`](https://github.com/jakubkrehel/skills/commit/79a09456be60419e652e63fc9e057b5587d051ea). Its MIT license is preserved in [`LICENSE.jakubkrehel-skills`](./LICENSE.jakubkrehel-skills).
