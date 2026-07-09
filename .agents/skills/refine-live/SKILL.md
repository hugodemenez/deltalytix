---
name: refine-live
description: In-chat fallback for the Timeline Inspector Refine agent. Use when the user runs `/refine live`, asks to "refine live", "go live", or answer refine jobs — but ONLY when no persistent agent is wired (no `npx transitions-refine live`). Prefer `npx transitions-refine live` for run-and-forget (relay spawns agent per click, no idle credit burn). This skill long-polls the relay, posts suggestions, handles scan/apply jobs.
---

# Refine Live

## Two modes

**Persistent (recommended — run and forget)**  
Run `npx transitions-refine live` from your project. The CLI starts the relay and wires `REFINE_AGENT_CMD` so the relay spawns your agent CLI **per Refine click**. No chat loop; idle = zero credit burn. Works hours later as long as the relay process keeps running. Stop with Ctrl-C (or `npx transitions-refine stop`).

**In-chat loop (fallback — this skill)**  
Run `/refine live` in Cursor/Claude/Codex when the relay is up but has **no** `REFINE_AGENT_CMD`. **You** become the poller via `GET /jobs/next`. The Agent tab stays available only while you keep polling — **each idle poll cycle consumes chat turns/credits**. Say "stop refine" to exit.

Use the in-chat loop only when you cannot wire a persistent agent CLI.

---

Turn yourself into the LLM behind the Timeline Inspector's **Refine** button (**in-chat fallback mode**). While
this loop runs, the panel's **LLM** tab is "available": each click sends one
transition here, you reason about it, and your suggestions appear in the panel.

You are the poller. Nothing is installed — you just talk to a small local relay
(default `http://localhost:7331`) that the `npx` injector already started.

## How it works

```
Browser (Refine, LLM tab) ──POST /jobs──► relay ──GET /jobs/next──► YOU
                          ◄──GET /jobs/:id── relay ◄──POST /jobs/:id/result── YOU
```

## The loop — stay live, but don't burn credits forever

Keep polling so the panel's LLM tab stays "available", but this loop costs chat
turns/credits even while idle, so it is **not** truly run-and-forget — it has
three exits, in priority order:

1. **Relay stop signal (authoritative).** `GET /jobs/next` may return `200` with
   `{"stop": true}`. The relay sends this when the user clicks **Stop** in the
   panel, or automatically after ~10 min with no jobs. **Always honor it: stop
   looping immediately**, tell the user the LLM tab will go unavailable and how to
   resume (`/refine live`), and end your turn. Never re-poll after a stop signal.
2. **The user says so** — "stop refine", "exit live", etc.
3. **Your own idle backoff (safety net).** A long stretch of `204`s is normal —
   it just means no one has clicked Refine yet — but to avoid spending credits on
   a forgotten loop, **back off as idle grows** instead of hammering immediately:
   re-poll right away for the first few empty cycles, then pause ~5s between polls,
   and after ~10 min of unbroken idle stop on your own (same as the relay's
   auto-stop) and tell the user how to resume. Any real job resets the backoff.

The relay reports the agent as "available" for ~120s after your last poll, so
short pauses keep you live. A successful job always resets idle, so an active
session never backs off.

0. **Announce yourself once, before the first poll.** The relay keeps a *sticky*
   Stop latch: after a panel **Stop** (or the idle auto-stop) it answers every
   `GET /jobs/next` with `{"stop": true}` until a new agent explicitly resumes —
   so a stopped session can't silently come back. Clear the latch a single time
   at startup, then begin polling:

   ```bash
   curl -s -X POST http://localhost:7331/poller/start
   ```

   Do **not** call this again mid-loop (it would defeat a user's Stop). Only on a
   fresh `/refine live`.

1. **Claim the next job (long-poll).** This call blocks up to ~25s, then returns.

   ```bash
   curl -s http://localhost:7331/jobs/next
   ```

   - HTTP `204` / empty body → no work yet. Poll again, applying the idle
     backoff above (immediate at first, then ~5s pauses, then stop after ~10 min).
   - HTTP `200` with `{"stop": true}` → **the loop must end.** Stop polling, tell
     the user the LLM tab is now unavailable and that `/refine live` resumes it,
     and end your turn. Do not treat it as a job.
   - HTTP `200` with a job JSON → work to do. Shape:

     ```json
     {
       "id": "uuid",
       "request": {
         "label": "Resize + Color",
         "selector": ".box-resize",
         "mode": "llm",
         "refineType": "small",
         "timings": [
           { "property": "width", "durationMs": 400, "delayMs": 0, "easing": "ease-out" },
           { "property": "background", "durationMs": 400, "delayMs": 0, "easing": "ease-out" }
         ]
       }
     }
     ```

   - **If `request.kind === "scan"`** this is not a suggestion job — the panel is
     asking you to group the page's transitions by reading the source. Jump to
     [`## Scan jobs`](#scan-jobs-group-from-source) and return `groups` instead of
     suggestions.
   - **If `request.kind === "apply"`** this is not a suggestion job — the user
     pressed **Accept** to write changes to their code. Jump to
     [`## Apply jobs`](#apply-jobs-write-to-source) and edit the source instead of
     posting suggestions. Everything below (refineType, steps 3–4) is for the
     normal Refine flow.
   - `refineType` chooses what kinds of suggestions to make (it mirrors the
     panel's two tabs). The tabs scan **independently**, so answer only the one
     you were asked for:
     - `"small"` (or missing) → **Small refinements**: nudge the existing
       declarations toward the motion tokens **only** (step 3a). Do **not**
       propose a recipe swap here — that's the Replace tab's separate job.
     - `"replace"` → **Replace transition**: suggest a whole-transition recipe
       swap **only** (step 3b). Do **not** propose motion-token tweaks — skip
       step 3a entirely.

2. **(Optional) post progress** so the panel shows what you're doing:

   ```bash
   curl -s -X POST http://localhost:7331/jobs/<id>/status \
     -H 'Content-Type: application/json' \
     -d '{"message":"Matching to transitions.dev motion tokens…"}'
   ```

3. **Answer in ONE shot — speed matters.** Each click should feel instant, so
   resolve the job from the data below plus what's already in this skill. Do **not**
   spawn subagents or run a broad codebase search, and do **not** open the
   transitions-dev `SKILL.md` — its tokens and decision rules are inlined here.
   - `refineType === "small"` → step 3a only, with **zero file reads**.
   - `refineType === "replace"` → step 3b only; open **at most the one** recipe
     reference file you choose.

   First, infer each declaration's **usage** from `label` + `selector` (modal
   close, dropdown open, tooltip, badge, resize, color/theme change…). Match on
   **intent, not the nearest number**.

   **3a. Motion-token tweaks (`refineType === "small"` only — no file reads).**
   Pick the token that fits the usage and propose a change **only where the current
   value actually differs**.

   - **Durations:** 40ms Stagger (per-item offset) · 80ms Micro (tooltip delay,
     shake segment) · 150ms Quick (modal/dropdown close, text swap, tooltip
     appear) · 250ms Fast (icon swap, dropdown/modal open, tabs slide, page
     slide) · 350ms Medium (panel/toast close) · 400ms Slow (panel open, skeleton
     reveal, input clear) · 500ms Very slow (emphasis, badge appear, text reveal,
     success check).
   - **Default easing — "Smooth ease out":** `cubic-bezier(0.22, 1, 0.36, 1)`
     (modal/dropdown/panel open+close, page slide, resize, position change).
   - **Other on-grid easings — LEAVE UNCHANGED:** `ease-out` (tooltip),
     `ease-in-out` (icon/text swap, text reveal, skeleton reveal), `linear`
     (shimmer, pulse, spinner), `cubic-bezier(0.34, 1.36, 0.64, 1)` (badge pop),
     `cubic-bezier(0.34, 3.85, 0.64, 1)` (avatar return).
   - **Nudge toward Smooth ease out:** generic `ease`, `ease-in`, or any
     hand-rolled cubic-bezier()/linear() that isn't a token above.

   **3b. Whole-transition recipe swap (`refineType === "replace"` only — no file
   reads).** Match the inferred usage to ONE recipe below (this list *is* the
   decision rules — no SKILL.md or reference-file read needed). Emit ONE
   `kind: "replace"` suggestion whose `patch` carries the **motion-token**
   duration/easing for the recipe's phase (open vs close) on the property that
   already transitions (or `"all"`), with a `reference` field naming the file and
   the recipe in `title` + `reason`. The patch only drives the live preview —
   exact keyframes/structure come from the user pasting that reference file, so you
   never need to open it. If no recipe genuinely fits the usage, return an
   **empty** `suggestions` array with a short `summary`.

   - Card resize — a container changes width/height on a layout change (`01-card-resize.md`)
   - Number pop-in — a number/digit updates (`02-number-pop-in.md`)
   - Notification badge — a small dot/badge appears on a trigger (`03-notification-badge.md`)
   - Text states swap — text content changes in place (`04-text-states-swap.md`)
   - Menu dropdown — an anchored surface grows from its trigger (`05-menu-dropdown.md`)
   - Modal open/close — a centered dialog scales up, softer scale-down on close (`06-modal.md`)
   - Panel reveal — a surface slides into a region with a cross-blur (`07-panel-reveal.md`)
   - Page side-by-side — slide between list↔detail or step 1↔step 2 (`08-page-side-by-side.md`)
   - Icon swap — two icons cross-fade in the same slot (`09-icon-swap.md`)
   - Success check — a checkmark celebration: fade + rotate + bob + stroke-draw (`10-success-check.md`)
   - Avatar group hover — hover lifts an item in a horizontal stack (`11-avatar-group-hover.md`)
   - Error state shake — invalid-input shake (`12-error-state-shake.md`)
   - Input clear with dissolve — clearing a text field (`13-input-clear-dissolve.md`)
   - Skeleton loader and reveal — placeholder pulses then swaps to real content (`14-skeleton-reveal.md`)
   - Shimmer text — in-progress / "thinking" text shimmer (`15-shimmer-text.md`)
   - Tabs sliding — a moving highlight across segmented options (`16-tabs-sliding.md`)
   - Tooltip open/close — delayed fade+scale in, instant out (`17-tooltip.md`)
   - Texts reveal — staggered blurred rise of stacked text lines (`18-texts-reveal.md`)
   - Card hover tilt — 3D tilt toward the pointer (`19-card-tilt.md`)
   - Plus to menu morph — a circular trigger becomes the surface it opens (`20-plus-menu-morph.md`)
   - Accordion expand — a collapsible body grows/shrinks in height (`21-accordion.md`)

   Tie-break: prefer the lower-overhead recipe (card resize over panel reveal,
   dropdown over modal). Only propose a swap when the current declarations are
   clearly a hand-rolled version of a recipe or are missing the structure the usage
   calls for; if the transition already *is* the right recipe, return empty.

4. **Post the result** (this completes the job and renders cards in the panel):

   ```bash
   curl -s -X POST http://localhost:7331/jobs/<id>/result \
     -H 'Content-Type: application/json' \
     -d '{
       "summary": "Tightened the resize and softened the color fade.",
       "suggestions": [
         {
           "id": "width-duration",
           "kind": "duration",
           "property": "width",
           "title": "Duration → Snappy (250ms)",
           "from": "400ms",
           "to": "250ms",
           "patch": { "property": "width", "durationMs": 250 },
           "reason": "A size change reads as direct manipulation — snappy is more responsive than 400ms."
         }
       ]
     }'
   ```

   The example above is a `small` job (token tweaks only). A `replace` job instead
   returns a single `kind: "replace"` card as its **only** suggestion:

   ```json
   {
     "id": "replace-card-resize",
     "kind": "replace",
     "property": "width",
     "title": "Replace with Card resize",
     "from": "hand-rolled width tween",
     "to": "transitions.dev · Card resize",
     "patch": { "property": "width", "durationMs": 250, "easing": "cubic-bezier(0.22, 1, 0.36, 1)" },
     "reference": "transitions-dev/01-card-resize.md",
     "reason": "This is a width tween on layout change — the Card resize recipe handles it properly. Apply nudges the live timing; paste 01-card-resize.md (run `transitions apply card-resize`) for the full recipe."
   }
   ```

   If nothing should change, post `"suggestions": []` with a short `summary`.
   If something goes wrong, report it instead:

   ```bash
   curl -s -X POST http://localhost:7331/jobs/<id>/error \
     -H 'Content-Type: application/json' -d '{"message":"…"}'
   ```

5. **Go back to step 1.** Keep looping, but honor the three exits from
   [the loop section](#the-loop--stay-live-but-dont-burn-credits-forever): a
   `{"stop": true}` from the relay, the user telling you to stop, or your own idle
   backoff/auto-stop after ~10 min quiet. A real job resets idle. Whenever you do
   stop, tell them the LLM tab will go unavailable and how to restart
   (`/refine live`).

## Scan jobs (group from source)

When a claimed job has `request.kind === "scan"`, the panel wants you to turn a
flat list of DOM-detected transitions into **components with phases**. A naive
DOM scan only sees each element's *current* computed transition — it can't tell
open from close, and lists related elements (panel, backdrop, staggered items)
separately. You fix that by reading the source. The request looks like:

```json
{
  "id": "uuid",
  "request": {
    "kind": "scan",
    "url": "http://localhost:5173/",
    "raw": [
      { "label": "div.dropdown-panel", "selector": ".dropdown-panel",
        "properties": ["opacity","transform"],
        "timings": [{ "property": "opacity", "durationMs": 200, "delayMs": 0, "easing": "ease-out" }],
        "cssRules": [
          ".dropdown .dropdown-panel { opacity: 0; transition: opacity 200ms ease-out 0ms, transform 200ms cubic-bezier(0.22, 1, 0.36, 1) 0ms; }",
          ".dropdown.is-open .dropdown-panel { opacity: 1; transform: translateY(0); }",
          ".dropdown.is-closing .dropdown-panel { transition: opacity 150ms ease-in 0ms; opacity: 0; }"
        ] }
    ]
  }
}
```

**Be fast.** The `raw.timings` are already accurate for each element's *current*
on-screen state — treat them as ground truth and reuse them verbatim. Most `raw`
entries also carry **`cssRules`**: the CSS rules harvested live from the page
(CSSOM) that drive that element across *all* states (base + open + close), with
`var()` already resolved to concrete values.

**Fast path — prefer `cssRules` over the filesystem.** When an entry has
`cssRules`, they are authoritative and contain everything you need: the opposite
phase's timings live on a state-variant selector inside them (e.g.
`.dd.is-closing .dd-panel`, `.modal[data-closing] .dialog`), and the toggled
state is visible in those selectors. Derive grouping, phases, toggled state, and
opposite-phase timings **directly from `cssRules` + `timings`** — do **not**
glob/grep/read files for any element whose `cssRules` is non-empty; it only
wastes time. Only fall back to reading source for entries with an empty/missing
`cssRules` (CORS-locked sheets, styled-components, Tailwind, etc.), and even then
read the minimum.

Do this:

1. **Identify each animated component** the raw entries belong to (dropdown,
   modal, tooltip, accordion, drawer, toast…). The selectors/labels usually make
   this obvious — only read source (plain CSS / CSS Modules,
   styled-components/emotion, Tailwind, inline styles, Motion/Framer variants)
   when the grouping is genuinely unclear.
2. **Split each component into phases** — usually `open` and `close` (a hover-only
   component can be a single phase). The phase matching the current DOM reuses the
   provided timings; the *opposite* phase often lives on a different selector
   (`.is-open` vs `.is-closing`) with different timings — take it from the entry's
   `cssRules` (or, only if it has none, read source). Report **both** even though
   only one is in the DOM right now.
3. **List each phase's members** — the elements that animate in that phase. Give
   each a stable `id`, a human `label`, a live-resolvable CSS `selector`, an
   optional `toState` hint (the class/attribute that drives the phase, e.g.
   `.is-open`), and its `propertyTimings`. For the current-state phase, **copy the
   provided `raw.timings` verbatim**; for the opposite phase, **quote the real
   timings from the entry's `cssRules`** (already var()-resolved) — or from source
   if it has none — **never invent.**
4. **Post the groups** (this completes the job):

   ```bash
   curl -s -X POST http://localhost:7331/jobs/<id>/result \
     -H 'Content-Type: application/json' \
     -d '{
       "summary": "Grouped Dropdown into Open/Close.",
       "groups": [
         { "id": "dropdown", "label": "Dropdown", "component": "src/Dropdown.tsx",
           "phases": [
             { "id": "dropdown:open", "phase": "open", "label": "Open", "members": [
               { "id": "panel", "label": "Panel", "selector": ".dropdown-panel", "toState": ".is-open",
                 "propertyTimings": [
                   { "property": "opacity", "durationMs": 200, "delayMs": 0, "easing": "ease-out" },
                   { "property": "transform", "durationMs": 200, "delayMs": 0, "easing": "cubic-bezier(0.22, 1, 0.36, 1)" }
                 ] }
             ] },
             { "id": "dropdown:close", "phase": "close", "label": "Close", "members": [
               { "id": "panel", "label": "Panel", "selector": ".dropdown-panel", "toState": ".is-closing",
                 "propertyTimings": [
                   { "property": "opacity", "durationMs": 150, "delayMs": 0, "easing": "ease-in" }
                 ] }
             ] }
           ] }
       ]
     }'
   ```

   If you can't confidently group anything, post `{"groups":[],"summary":"…"}` —
   the panel keeps its flat DOM scan. Reserve `/jobs/<id>/error` for unexpected
   failures.

Then go back to step 1 of the loop.

## Apply jobs (write to source)

When a claimed job has `request.kind === "apply"`, the user accepted their current
timeline values and wants them written to the codebase. The request looks like:

```json
{
  "id": "uuid",
  "request": {
    "kind": "apply",
    "label": "Dropdown · Close",
    "selector": ".dropdown-panel",
    "component": "src/Dropdown.tsx",
    "group": "Dropdown",
    "phase": "close",
    "changes": [
      { "property": "opacity", "member": "Panel", "selector": ".dropdown-panel",
        "from": { "durationMs": 300, "delayMs": 0, "easing": "ease" },
        "to": { "durationMs": 150, "delayMs": 0, "easing": "cubic-bezier(0.4, 0, 1, 1)" } }
    ]
  }
}
```

Do this:

1. **Locate the real declaration in the source.** The `selector` is a DOM-path
   *hint*, not necessarily the source selector. Use the `component` hint and search
   by the label/class names; handle whatever the project uses: plain CSS / CSS
   Modules, styled-components or emotion template literals, Tailwind utilities
   (`duration-300`, arbitrary `[transition-duration:300ms]`, or the
   `tailwind.config` theme), inline `style={{ transition: … }}` objects, and
   Motion/Framer variants. Match by the `from` values to disambiguate.
   - **If `phase` is set** (e.g. `"open"`/`"close"`), edit only that state's rule
     (the `.is-open` rule for open, the `.is-closing`/base rule for close) — not
     the other phase. Each change's `member` + `selector` says which element.
2. **Edit each change's property** to its `to` values (`durationMs` ms, `easing`,
   `delayMs` ms) on the right member + phase. Keep the file's existing unit/format
   (`0.25s` vs `250ms`) and touch only that property's timing. If a CSS variable /
   design token backs the value, update it at the single most sensible place.
3. **Minimal edit** — no reformatting or unrelated changes.
4. **Post the outcome** (this completes the job):

   ```bash
   curl -s -X POST http://localhost:7331/jobs/<id>/result \
     -H 'Content-Type: application/json' \
     -d '{"applied":true,"summary":"Set .t-modal transition to 150ms ease-in","files":["src/Modal.css:42"]}'
   ```

   If you cannot confidently find the declaration, post
   `{"applied":false,"summary":"<what you searched and why not found>"}` (still a
   `result`, not an `error`). Reserve `/jobs/<id>/error` for unexpected failures.

Then go back to step 1 of the loop.

## Suggestion shape (must match the panel)

Each suggestion object:

| field | meaning |
| --- | --- |
| `id` | unique within the job (e.g. `"width-duration"`) — used to track "Applied" |
| `kind` | `"duration"` \| `"delay"` \| `"easing"` for token tweaks, or `"replace"` for a whole-transition swap (drives the card label) |
| `property` | the CSS property this targets, or `"all"` |
| `title` | short label shown on the card |
| `from` / `to` | human-readable before → after |
| `patch` | **what actually gets applied** — `{ "property", "durationMs"?, "delayMs"?, "easing"? }`. Include only changed fields; `property` must match an input property (or `"all"`). For a `replace`, use the chosen recipe's recommended timing here so Apply still does something live. |
| `reference` | *(replace only, optional)* the transitions.dev reference file the user should paste for the full recipe, e.g. `"transitions-dev/06-modal.md"`. |
| `reason` | one sentence of *why*, in usage terms |

The panel applies `patch` live in the browser via the property override. Values
are not written to source files — the user copies the ones they keep.

## Notes

- Relay port: `http://localhost:7331` unless `REFINE_RELAY_PORT` was changed.
- Only **LLM**-mode jobs reach you; **Deterministic**-mode jobs are answered by
  the relay itself (nearest-token snapping) and never appear here. Whole-transition
  **replace** suggestions are therefore LLM-only — the deterministic path can't
  infer usage well enough to pick a recipe, so a Deterministic + "Replace
  transition" job just returns an empty result pointing the user back to the Agent
  tab.
- A `replace` card's Apply only changes the live timing in the patch. The recipe's
  structural parts (keyframes, extra properties, JS hooks) aren't applied in the
  browser — that's why the card points the user at the reference file to paste.
- The relay errors a waiting job after ~120s, so answer promptly once you claim
  one. The long-poll itself returning `204` is normal — just poll again.
