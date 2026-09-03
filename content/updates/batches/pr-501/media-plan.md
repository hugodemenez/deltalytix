# Changelog media plan: pr-501

## account-payment-renewal-notice

- Decision: 1 visual
- Rationale: The claim is a **new inbox letter** — kicker, firm-and-day H1, mint calendar (today / range / payment), and **Change reminder**. One rendered HTML still of the locked sample (Apex, 7 days, 5→12 Sep) shows that faster than prose. A second crop of only the calendar would repeat the same email. Video would replay a static letter.
- Primary/card asset: `account-payment-renewal-notice.png` — new scene `renewal-notice-email`. Renders `RenewalNoticeEmail` with the test lock (`Hugo`, Apex, `LOCAL-SIM-001`, `now: 2026-09-05`, `nextPaymentDate: 2026-09-12`, `daysUntilRenewal: 7`). Viewport ~800×1600, no app chrome. EN expects **Account payment**, **Hi Hugo,**, **Apex payment in 7 days.**, **September**, **Change reminder**. FR expects **Paiement du compte**, **Bonjour Hugo,**, **Paiement Apex dans 7 jours.**, **Septembre**, **Modifier le rappel**. Light Paper page `#F7F7F4`. Does not open admin `/admin/send-email`.
- Additional assets: none.
- Omitted candidates:
  - Dark-client `dm-*` rendering — would look like a second product email.
  - n=1 **tomorrow** variant — same chrome; copy already names the string.
  - Admin send-email preview UI — internal tooling, not the inbox letter.
  - Reusing `weekly-recap-sample.png` — different mail, different chrome.

## landing-hero-16-9-demo

- Decision: 1 visual
- Rationale: The claim is the **16:9 mint well** on the first viewport (was ultrawide). One `landing-hero` still at 1440×900 with cookies dismissed shows heading, **Get Started** / **Features ↓**, and the new frame together. A second asset of the dark cut would only restated “there is a dark file.” Recording the hero `<video>` as an MP4 would re-encode the shipped demo without proving a distinct layout claim.
- Primary/card asset: `landing-hero-16-9-demo.png` — existing scene `landing-hero` (desktop 1440×900, `/{locale}`, consent dismissed). Wait for the settled hero (poster or playing loop). Expected: 16:9 well, not 2108×1080. EN H1 / **Get Started** / **Features ↓**; FR **Votre journal de trading.** / **Commencer maintenant** / **Fonctionnalités ↓**.
- Additional assets: none.
- Omitted candidates:
  - Dark-theme hero — copy already says both cuts exist; light is the default card.
  - Hero video MP4 — motion of an already-looping demo; the still is the aspect-ratio evidence.
  - Consent card visible — not an entry; `landing-hero` correctly dismisses cookies.
  - Reusing `landing-page-redesign.png` — ultrawide-era frame; would contradict this follow-up.
