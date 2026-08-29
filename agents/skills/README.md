# Shared agent skills

This directory holds **first-party** Deltalytix skills only. Each skill lives in `agents/skills/<name>/` with a `SKILL.md` entry point. Agent-specific directories contain symlinks, never duplicated first-party content.

Third-party skills (`remotion-*`, `better-*`) are **not** vendored here. They are installed with [`npx skills`](https://skills.sh/) into `.agents/skills/` (gitignored) and restored from [`skills-lock.json`](../../skills-lock.json).

## How each agent discovers first-party skills

Codex reads [`AGENTS.md`](../../AGENTS.md), which points here directly. Claude Code and Cursor only auto-discover skills under their own directories, so each first-party skill is symlinked into both:

```
.claude/skills/<name>  ->  ../../agents/skills/<name>
.cursor/skills/<name>  ->  ../../agents/skills/<name>
```

Both tools follow a symlinked skill entry and read `SKILL.md` from the target, so the skill loads by name and description without a second copy on disk.

**When adding a first-party skill**, create it in `agents/skills/<name>/` with `name` and `description` frontmatter, then link it into both trees:

```bash
ln -s "../../agents/skills/<name>" ".claude/skills/<name>"
ln -s "../../agents/skills/<name>" ".cursor/skills/<name>"
```

Windows contributors need `git config core.symlinks true` (and Developer Mode) for the links to check out as links rather than plain text files.

## Third-party skills (`npx skills`)

Canonical copies land in `.agents/skills/`. Cursor treats that directory as its project skills root. `bun run skills:install` also symlinks each installed skill into `.cursor/skills/` and `.claude/skills/` so desktop Cursor and Claude Code still auto-discover them.

Restore after clone (or when the lockfile changes):

```bash
bun run skills:install
# equivalent: npx skills experimental_install, then the same symlinks
```

Add or bump a third-party skill with the CLI, then commit the updated `skills-lock.json`. Do not copy those trees into `agents/skills/` or git.

```bash
npx skills add remotion-dev/skills --skill '*' --agent cursor --agent claude-code -y
npx skills add jakubkrehel/skills \
  --skill better-accessibility --skill better-colors --skill better-interface \
  --skill better-layout --skill better-typography --skill better-ui --skill better-writing \
  --agent cursor --agent claude-code -y
bun run skills:install
```

Do not pass `--all` (it installs into every agent directory the CLI knows about).

## Import

- [`import-file-parse`](./import-file-parse/SKILL.md): parse any trading CSV (closed trades or order fills) through Intelligent Import. Use a parse plan, not Vercel Eve.

## Deltalytix workflows

- [`changelog-review`](./changelog-review/SKILL.md): review a release diff and prepare the editorial outline.
- [`changelog-entries`](./changelog-entries/SKILL.md): write paired English and French changelog entries.
- [`changelog-media`](./changelog-media/SKILL.md): plan, capture, and wire localized release media.
- [`marketing-email-chrome`](./marketing-email-chrome/SKILL.md): reuse the August 2026 Resend / Zeno marketing email chrome lock.

## Interface skills

Installed from [`jakubkrehel/skills`](https://github.com/jakubkrehel/skills) (MIT). Restore with `bun run skills:install`.

- `better-interface`: coordinate a holistic interface review.
- `better-accessibility`: review semantics, keyboard behavior, forms, assistive technology, and accessibility requirements.
- `better-colors`: review palettes, color usage, gamut, and contrast remediation.
- `better-layout`: review grouping, alignment, spacing, responsive structure, and reading order.
- `better-typography`: review font selection, type systems, text rendering, and wrapping.
- `better-ui`: review surfaces, icons, motion, and interface polish.
- `better-writing`: review interface copy, terminology, labels, errors, and empty states.

Do not install the extra skills in that repo (`break`, `variant`, `explain-interface`, `interface-review`).

## Remotion

Installed from [`remotion-dev/skills`](https://github.com/remotion-dev/skills) (MIT). Restore with `bun run skills:install`.

- `remotion-best-practices`: router for all Remotion skills.
- `remotion-create`: scaffold a Remotion project or composition.
- `remotion-markup`: React markup, animation, layout, timing, media, and effects.
- `remotion-studio`: preview a composition in Remotion Studio.
- `remotion-render`: export a video or still.
- `remotion-captions`: captions and subtitles.
- `remotion-interactivity`: Studio-editable markup.
- `remotion-maps`: map animations.
- `remotion-multimedia`: Mediabunny browser multimedia.
- `remotion-saas`: Remotion-powered apps and product integrations.
- `remotion-docs`: search Remotion documentation.
- `remotion-upgrade`: upgrade Remotion packages and skills.

Promo intro craft (word stagger, mesh, highlight, grain) is adapted in [`videos/motion/intro.md`](../../videos/motion/intro.md) from those official skills plus [`haidrrrry/claude-remotion-skill`](https://github.com/haidrrrry/claude-remotion-skill). Do not vendor that skill as a default — its spring / dark-grade / grain-over-everything rules fight Paper tokens and chart-axis stability.

Deltalytix promo motion (timing, widgets, SFX, handoff) is **not** a Remotion skill. It lives in [`videos/motion/`](../../videos/motion/AGENTS.md).
