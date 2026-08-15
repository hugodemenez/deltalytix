# Changelog media plan: pr-452

## weekly-trading-recap-email

- Decision: 1 visual
- Rationale: Hugo asked for an inbox sample of the shipped Zeno chrome on the changelog. A single localized sample screenshot (green-week mock week, not live user P&L) shows the full-bleed 680 layout, Net P&L hero, Mon–Sun daily rows, wins/losses, and CTA panel faster than prose alone. Behavioral send-gate and Sunday Lisbon timing remain text-only.
- Primary/card asset: `weekly-recap-sample.png` — sample weekly recap email for a green Mon–Sun week (mock data: Net P&L +875€, Week of 3–9 Aug / Semaine du 3–9 août)
- Additional assets: none (EN and FR are locale variants of the same primary scene, not separate claims)
- Omitted candidates:
  - Optional light vs dark client rendering of `dm-*` markup — would not prove a distinct product claim and risks implying two different emails.
  - Cron / Sunday Lisbon schedule visualization — timing and DST caveats stay textual.
  - Empty-week / “missing you” state — intentionally not sent; do not invent a visual.
  - Intermediate Paper 9OS-0 look — superseded before ship; must not be captured.
