# Changelog media plan: pr-452

## weekly-trading-recap-email

- Decision: 0 visuals
- Rationale: The finished EN/FR copy already states the user-facing story clearly — green-week send gate (trades + net P&L ≥ 0), no consolation mail, Mon–Sun UTC window, Sunday ~08:00 Lisbon timing, inbox contents (Net P&L, week range, wins/losses, win rate, CTAs), from address, and unsubscribe. The decisive claims are behavioral (when mail does or does not send) and scheduling/DST notes; those are not proved by a static campaign screenshot and are better as text. The surface is email HTML (`components/emails/weekly-recap.tsx`), not an in-app route in the standard scene catalog. Capturing “what lands in the inbox” would require inventing a new email-render/preview scene plus fixture data that is not live user P&L — high cost for evidence the copy already lists section-by-section. A forced hero of Zeno chrome would be decorative, not claim-proving, and risks implying every week gets a recap.
- Primary/card asset: none
- Additional assets: none
- Omitted candidates:
  - Rendered weekly recap HTML (Zeno full-bleed, Net P&L hero, week-of, wins/losses/win rate, CTAs) — would only decorate the “what lands in your inbox” section; copy already names those fields and CTAs. Not in the scene catalog; building a capture-only email renderer for one release is discouraged when text suffices.
  - Optional light vs dark client rendering of `dm-*` markup — would not prove a distinct product claim, risks implying two different emails, and honest dual-client capture is fragile without adding product or heavy capture mocks.
  - Cron / Sunday Lisbon schedule visualization — timing and DST caveats are textual; a screenshot cannot show schedule or winter UTC note usefully.
  - Empty-week / “missing you” state — intentionally not sent; do not invent a visual for a non-existent mail.
  - Intermediate Paper 9OS-0 look — superseded before ship; must not be captured.
