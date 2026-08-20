# Changelog media plan: pr-475

## dashboard-v5-shell

- Decision: 2+ visuals
- Rationale: This is a location/layout redesign — the whole point is chrome that moved (tab strip → view menu, filters → top bar, connections strip, layout-only pill). No existing scene shows the new chrome; `widgets-mobile`, `billing-mobile`, and `trade-table-desktop` all predate it. Two distinct captures prove two different claims: the top-bar chrome as a whole, and the filters interaction that chrome now exposes. A billing/subpage shot would mostly re-prove the `← Dashboard | Title` pattern that `settings-v2-account-page` already carries in spirit, so it is skipped here to avoid a third near-duplicate "chrome" shot.
- Primary/card asset: `dashboard-shell-home.png` — new scene `dashboard-shell-home` (desktop, `/en|fr/dashboard`). Captures the full v5 top bar together: logo, compact view menu, **This week** / **+ Filter**, Share, **Account**, the **Connections** strip beneath the nav, and the floating **Edit | Add** pill at the bottom of the same viewport.
- Additional assets:
  - `dashboard-shell-filters.png` — new scene `dashboard-shell-filters` (desktop). Opens the right-hand filter sheet from **+ Filter**, expands the **Accounts** fold section (proving the one-section-at-a-time pattern), selects **Select all accounts**, and captures the sheet once the pinned active-filter chip and **Clear all** render above the still-collapsed sections. This is a different claim from the home shot: the filters UI itself, not just its top-bar entry point.
- Omitted candidates:
  - Mobile chrome (drawer/toolbar/minimap) — the widget minimap restoration is already covered by the immutable `mobile-widget-minimap-navigation` entry; recapturing mobile chrome here would mostly restate that, not this entry's story.
  - Billing subpage (`← Dashboard | Billing` + Current plan/Available plans/Billing history) — real second claim, but redundant with the `← Dashboard | Title` idea already implied by the settings entry; skipped to keep this entry at two tightly-framed assets instead of three overlapping ones.
  - Add-widget empty state — small, and the outline explicitly flags the unmounted plan chip / billing sheet as off-limits; the empty-catalog case is a minor supporting detail, not a primary claim worth its own asset.
  - Unmounted plan chip / in-navbar billing sheet — explicitly must not be captured (not in the shipped UI).
  - Old full-width Widgets/Table/Accounts tab strip — must not be recaptured as if it still ships.

## settings-v2-account-page

- Decision: 1 visual
- Rationale: One state — the stacked list — carries the whole "Settings is now a short account page" claim. Delete confirmation must never be captured (irreversible, and local bypass can't complete it anyway), so there is nothing further to show without restating the same list.
- Primary/card asset: `settings-account-list.png` — new scene `settings-account-list` (desktop, `/en|fr/dashboard/settings`, reached through the hydrated dashboard). Shows the full stacked list — **Account**, **Linked accounts**, **Weekly recap** (switch on), **Team**, **Sign out**, **Delete account** — on the light canvas.
- Additional assets: none.
- Omitted candidates:
  - Delete confirm dialog — outline explicitly forbids confirming, and even the cancel-state dialog mostly restates the "Delete account" row already visible in the primary shot; not worth a second asset.
  - Trading Preferences absence — a negative claim ("no longer here"); a screenshot of a page not containing something proves nothing on its own.

## dxfeed-login-detects-prop-firm

- Decision: 1 visual
- Rationale: The entire story is "one step now, not two" — a single screenshot of the current form with only Username + Password (no firm picker) proves the change completely. A "connected" success card would need a mocked provider response; the outline explicitly makes that conditional on doing so honestly, and it adds a second claim (detection works) beyond what this capture set needs to prove (the step count dropped).
- Primary/card asset: `dxfeed-single-step-form.png` — new scene `dxfeed-single-step-form` (desktop). Opens **DxFeed** from the Connections "Add connection" menu and captures the dialog heading, description, empty **Username**/**Password** fields, and **Connect** button. Verified against `dxfeed-connect-form.tsx`: current field IDs are `#dxfeed-username` / `#dxfeed-password`, no `#dxfeed-prop-firm` anywhere in this form.
- Additional assets: none.
- Omitted candidates:
  - Detected-firm success card — would require a capture-only mock of a successful connection outcome; skipped for this batch to avoid overstating what a static mock proves. Reconsider only if a real (non-credential) mock of the post-connect account card is added under `scripts/changelog-media/`.
  - Old two-step catalog picker — must not be reused; the `dxfeed-firm-search` / `dxfeed-credentials-step` scenes stay in the codebase for their original (now-superseded) entries but are not reused here.

## csv-ai-chunked-parse

- Decision: 0 visuals
- Rationale: The two things worth showing — the honest AI-unavailable failure and the row-progress state on a large file — both depend on a carefully engineered fixture (headers ambiguous enough to require AI, but not so ambiguous the heuristic silently "succeeds" wrong) plus a live multi-step CSV-with-AI import flow (upload → local header heuristic → chunked execution → Review Trades). Building that fixture and flow now, without being able to run capture to validate it, risks landing a broken/fragile scene that fails during the parent's capture pass. The copy already names the exact UI strings (**Parsed from the file columns**, **Ready to import**, the AI-unavailable alert text, **Map these columns to continue**), so text alone carries the claim.
- Primary/card asset: none.
- Additional assets: none.
- Omitted candidates:
  - Review Trades success state (headers alone) — achievable, but it would look identical to the pre-existing `ai-csv-field-mapping` entry's screenshots and would not visually distinguish "chunked + honest failure" from "field mapping," so it would not clearly support this entry's specific claim.
  - AI-unavailable alert with a dummy `OPENAI_API_KEY` — the strongest candidate, but requires a fixture whose headers are ambiguous enough to need AI; not built for this batch per the guidance that zero visuals is valid when capture is fragile.
  - In-progress `{processed} of {total} rows` on a large fixture — needs a large multi-thousand-row fixture file; disproportionate effort for a numeric-progress claim already stated in copy.

## en-trading-journal-positioning

- Decision: 1 visual (EN only)
- Rationale: The existing `landing-hero` scene on `/en` already renders the new H1/subhead live from `landing.title` / `landing.description` — no new scene needed. The FR homepage is explicitly unchanged, so an FR capture would either look identical to already-published `landing-page-redesign` FR assets (misleadingly implying something changed) or need alt text specifically disclaiming it. Per the batch guidance ("honesty > symmetry"), the plan recommends the parent wire this image only into the EN MDX and leave `content/updates/fr/en-trading-journal-positioning.mdx` text-only, rather than duplicate-caption an unchanged FR screenshot.
- Primary/card asset: `en-hero-trading-journal.png` — existing scene `landing-hero` (desktop, `/en`). Capture will exist for both `en` and `fr` output folders (the capture script always renders both locales), but only the `en` file should be wired into MDX; the `fr` file should be left unused since the FR homepage did not change.
- Additional assets: none.
- Omitted candidates:
  - OG/Twitter card image — the outline itself says this is only worth capturing if it visibly carries the new headline; the OG layout is unchanged (only the headline/subhead/alt text inside it changed), so a static render would look identical to the existing OG asset and would not visibly demonstrate the copy change without reading fine print. Text is clearer here.

## landing-ios-safari-canvas-chrome

- Decision: 0 visuals
- Rationale: The claim is specifically about iOS Safari's `theme-color`-driven status bar and header, which Playwright's Chromium cannot render — a desktop Chromium screenshot of the same page would not visibly differ and would not honestly prove anything about Safari chrome. The outline explicitly says to prefer zero visuals when iOS capture is unavailable, which is the case in this environment.
- Primary/card asset: none.
- Additional assets: none.
- Omitted candidates:
  - Desktop Chromium screenshot of the landing hero in light/dark — would not show any status-bar/header seam either way (Chromium doesn't have that seam to begin with), so it proves nothing about this fix and would be decorative at best, misleading at worst.

## mindset-journal-editor-stability

- Decision: 0 visuals
- Rationale: The headline claim — "no longer crashes" — cannot be shown by a screenshot (a crash is a negative, in-the-moment event, and staging one would violate the "never fake a crash" constraint). The remaining visual difference (lighter toolbar, no table-insert button) is small and, without a side-by-side of the old TipTap toolbar, would not clearly read as "removed" to someone unfamiliar with the prior editor. Copy already names every toolbar affordance (headings, lists, quote, image, AI menu, fullscreen) and the one limitation (no table insert), so a small, easily-missed toolbar screenshot would add little.
- Primary/card asset: none.
- Additional assets: none.
- Omitted candidates:
  - Mindset journal pane open with the new toolbar visible — legitimate but minor; skipped per the outline's own "None is valid" guidance for this entry, in favor of not spending a new scene on a hard-to-read visual difference.
