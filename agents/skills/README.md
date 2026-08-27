# Shared agent skills

This is Deltalytix's canonical cross-agent skill directory. Keep each skill in `agents/skills/<name>/` with a `SKILL.md` entry point. This directory holds the only copy of every skill; agent-specific directories contain symlinks, never duplicated content.

## How each agent discovers these skills

Codex reads [`AGENTS.md`](../../AGENTS.md), which points here directly. Claude Code and Cursor only auto-discover skills under their own directories, so each skill is symlinked into both:

```
.claude/skills/<name>  ->  ../../agents/skills/<name>
.cursor/skills/<name>  ->  ../../agents/skills/<name>
```

Both tools follow a symlinked skill entry and read `SKILL.md` from the target, so the skill loads by name and description without a second copy on disk.

**When adding a skill**, create it in `agents/skills/<name>/` with `name` and `description` frontmatter, then link it into both trees:

```bash
ln -s "../../agents/skills/<name>" ".claude/skills/<name>"
ln -s "../../agents/skills/<name>" ".cursor/skills/<name>"
```

Windows contributors need `git config core.symlinks true` (and Developer Mode) for the links to check out as links rather than plain text files.

## Import

- [`import-file-parse`](./import-file-parse/SKILL.md): parse any trading CSV (closed trades or order fills) through Intelligent Import. Use a parse plan, not Vercel Eve.

## Deltalytix workflows

- [`changelog-review`](./changelog-review/SKILL.md): review a release diff and prepare the editorial outline.
- [`changelog-entries`](./changelog-entries/SKILL.md): write paired English and French changelog entries.
- [`changelog-media`](./changelog-media/SKILL.md): plan, capture, and wire localized release media.
- [`marketing-email-chrome`](./marketing-email-chrome/SKILL.md): reuse the August 2026 Resend / Zeno marketing email chrome lock.

## Interface skills

- [`better-interface`](./better-interface/SKILL.md): coordinate a holistic interface review.
- [`better-accessibility`](./better-accessibility/SKILL.md): review semantics, keyboard behavior, forms, assistive technology, and accessibility requirements.
- [`better-colors`](./better-colors/SKILL.md): review palettes, color usage, gamut, and contrast remediation.
- [`better-layout`](./better-layout/SKILL.md): review grouping, alignment, spacing, responsive structure, and reading order.
- [`better-typography`](./better-typography/SKILL.md): review font selection, type systems, text rendering, and wrapping.
- [`better-ui`](./better-ui/SKILL.md): review surfaces, icons, motion, and interface polish.
- [`better-writing`](./better-writing/SKILL.md): review interface copy, terminology, labels, errors, and empty states.

The `better-*` collection is vendored without content changes from [`jakubkrehel/skills`](https://github.com/jakubkrehel/skills) at commit [`79a09456be60419e652e63fc9e057b5587d051ea`](https://github.com/jakubkrehel/skills/commit/79a09456be60419e652e63fc9e057b5587d051ea). Its MIT license is preserved in [`LICENSE.jakubkrehel-skills`](./LICENSE.jakubkrehel-skills).

## Remotion

- [`remotion-best-practices`](./remotion-best-practices/SKILL.md): router for all Remotion skills.
- [`remotion-create`](./remotion-create/SKILL.md): scaffold a Remotion project or composition.
- [`remotion-markup`](./remotion-markup/SKILL.md): React markup, animation, layout, timing, media, and effects.
- [`remotion-studio`](./remotion-studio/SKILL.md): preview a composition in Remotion Studio.
- [`remotion-render`](./remotion-render/SKILL.md): export a video or still.
- [`remotion-captions`](./remotion-captions/SKILL.md): captions and subtitles.
- [`remotion-interactivity`](./remotion-interactivity/SKILL.md): Studio-editable markup.
- [`remotion-maps`](./remotion-maps/SKILL.md): map animations.
- [`remotion-multimedia`](./remotion-multimedia/SKILL.md): Mediabunny browser multimedia.
- [`remotion-saas`](./remotion-saas/SKILL.md): Remotion-powered apps and product integrations.
- [`remotion-docs`](./remotion-docs/SKILL.md): search Remotion documentation.
- [`remotion-upgrade`](./remotion-upgrade/SKILL.md): upgrade Remotion packages and skills.

The `remotion-*` collection is vendored without content changes from [`remotion-dev/skills`](https://github.com/remotion-dev/skills) at commit [`7a3d0ca45d2f6a00bf35cb3c525734a36d55a834`](https://github.com/remotion-dev/skills/commit/7a3d0ca45d2f6a00bf35cb3c525734a36d55a834). Remotion is MIT-licensed.

Deltalytix promo motion (timing, widgets, SFX, handoff) is **not** a Remotion skill. It lives in [`videos/motion/`](../../videos/motion/AGENTS.md).
