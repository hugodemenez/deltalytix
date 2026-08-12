# Changelog media plan: pr-439

## landing-page-interaction-polish

- Decision: 2+ visuals
- Rationale: The update spans three visually distinct homepage surfaces. A short hero-to-features recording proves the smooth, addressable transition, while stills of the denser AI conversation and quicker performance preview communicate the presentation changes without duplicating the motion evidence.
- Primary/card asset: `landing-ai-coach-compact.png`, scene `landing-ai-journaling-demo` — the strongest static card image, showing the compact text-only coach conversation with several turns.
- Additional assets:
  - `landing-features-transition.mp4`, scene `landing-features-transition` — activates **Features ↓**, lands on `#features`, and shows the feature overview in context.
  - `landing-performance-preview.png`, scene `landing-features-carousel` — performance-preview carousel and its progress/navigation controls.
- Omitted candidates:
  - Partner-logo strip — cleaner borders are a minor supporting polish and a fourth asset would be decorative beside the stronger interaction and feature evidence.

## equity-chart-nearest-account-hover

- Decision: 2 visuals
- Rationale: The chart proximity behavior and the account-selection constraint are separate user tasks. One image must show the nearest-line dot/legend ordering; another must show search plus the explicit eight-account ceiling.
- Primary/card asset: `equity-nearest-line.png`, scene `equity-nearest-line` — seeded overlapping account lines with one active dot and the nearest account first in the legend.
- Additional assets:
  - `equity-account-selector.png`, scene `equity-account-selector` — searchable selector with synthetic accounts and the selected/maximum summary.
- Omitted candidates:
  - Mobile selector drawer — the responsive container changes, but the same search and limit claim is already legible in the desktop selector.

## guided-dxfeed-connection-setup

- Decision: 2 visuals
- Rationale: The guided flow is explicitly two-step. Showing the searchable firm choice and the following credential step separately makes the progression clear without exposing or submitting credentials.
- Primary/card asset: `dxfeed-firm-search.png`, scene `dxfeed-firm-search` — first step narrowed to **My Funded Futures**.
- Additional assets:
  - `dxfeed-credentials-step.png`, scene `dxfeed-credentials-step` — selected firm summary with empty localized email/password fields.
- Omitted candidates:
  - Mobile firm drawer — it repeats the same options and search result rather than proving another product claim.

## interactive-brokers-flex-sync

- Decision: 2 visuals
- Rationale: The read-only Client Portal guide and the in-product token/query connection form carry different information. Both are necessary context, while a completed live connection would require unsafe external credentials.
- Primary/card asset: `ibkr-read-only-guide.png`, scene `ibkr-read-only-guide` — in-app setup guide with required Activity Flex Query settings and read-only notice.
- Additional assets:
  - `ibkr-token-query-form.png`, scene `ibkr-token-query-form` — verification form with fully synthetic token/query examples and no submission.
- Omitted candidates:
  - Saved synchronized connection — local capture has no safe IBKR test Flex Query, and fabricating successful external synchronization would overstate the evidence.

## mobile-form-focus-without-zoom

- Decision: 1 visual
- Rationale: The claim is the absence of iOS focus zoom, which a still cannot honestly prove. One short mobile recording of focus, text entry, and blur while the surrounding dashboard stays at the same scale is stronger than multiple redundant frames.
- Primary/card asset: none — video is the only honest evidence for this interaction-only fix.
- Additional assets:
  - `mobile-form-focus-stability.mp4`, scene `mobile-form-focus-stability` — an iPhone-sized dashboard field receives focus, synthetic text, and blur without a viewport-scale jump.
- Omitted candidates:
  - Paired before/after stills — desktop Chromium emulation cannot recreate historical iOS Safari automatic zoom, so a fabricated “before” would be misleading.

## authentication-page-redesign

- Decision: 2+ visuals
- Rationale: The redesign has a desktop visual composition, a meaningful post-email verification state, and a deliberately simplified mobile layout. Each asset demonstrates a distinct surface or state.
- Primary/card asset: `authentication-desktop.png`, scene `authentication-desktop` — signed-out split layout with complete form, candlesticks, and testimonial.
- Additional assets:
  - `authentication-email-code.png`, scene `authentication-email-code` — deterministic email-sent state with six code slots, resend/mailbox controls, and **Use a different email**, using a synthetic address and no outbound request.
  - `authentication-mobile.png`, scene `authentication-mobile` — focused single-column form at a narrow viewport.
- Omitted candidates:
  - Completed OTP — it would require a real session/code and adds no evidence beyond the safe verification state.

## support-assistant-source-first-help

- Decision: 2+ visuals
- Rationale: Trust in this workflow comes from three separate affordances: visible source investigation, editing an earlier question, and a direct human-contact path. Capture-only deterministic conversation data avoids variable AI output and never sends a support request.
- Primary/card asset: `support-source-investigation.png`, scene `support-source-investigation` — synthetic product question, localized search/read/reasoning markers, and answer in one conversation.
- Additional assets:
  - `support-question-edit.png`, scene `support-question-edit` — earlier question in edit mode with later replies marked for removal.
  - `support-contact-form.png`, scene `support-contact-form` — refreshed header action and open form populated only with synthetic information, stopped before submission.
- Omitted candidates:
  - Assistant-prepared escalation summary — it repeats the contact-form outcome and depends on variable generation.

## flexible-connection-sync-schedules

- Decision: 2+ visuals
- Rationale: Recurring intervals, daily-time controls, and the mobile drawer are meaningfully different scheduling states. Together they explain the breadth of the feature without relying on a time-sensitive countdown.
- Primary/card asset: `connection-sync-intervals.png`, scene `connection-sync-intervals` — desktop schedule menu with every recurring interval and the daily branch.
- Additional assets:
  - `connection-sync-daily.png`, scene `connection-sync-daily` — daily local-time controls, timezone note, and presets.
  - `connection-sync-mobile.png`, scene `connection-sync-mobile` — localized mobile drawer combining interval and daily controls, including **Turn off**.
- Omitted candidates:
  - Live next-sync countdown — it is time-sensitive and does not explain configuration as clearly as the controls.

## rithmic-protocol-primary-connection

- Decision: 2 visuals
- Rationale: The new default path is a guided two-step setup. The system search and credential/start-date step prove that structure without pretending a safe entitled Rithmic environment exists.
- Primary/card asset: `rithmic-system-search.png`, scene `rithmic-system-search` — selected connect point with searchable system picker open.
- Additional assets:
  - `rithmic-credentials-step.png`, scene `rithmic-credentials-step` — masked empty/synthetic credential fields, password visibility control, start-date guidance, and no submission.
- Omitted candidates:
  - Discovered account/success state — no safe entitled Protocol credentials or endpoint are available, so setup states are the honest boundary.
  - LucidTrading fallback internals — the recovery behavior is backend-only and has no truthful static UI state beyond successful synchronization.

## rithmic-performance-trade-date-import

- Decision: 2 visuals
- Rationale: The searchable picker establishes that this is the Rithmic Performance file-import workflow rather than Protocol synchronization, while the populated preview proves that an unedited current-format synthetic CSV reaches correctly aligned trade output. These are distinct selection and processing states.
- Primary/card asset: `rithmic-performance-preview.png`, scene `rithmic-performance-preview` — processed-trades preview populated from a synthetic CSV whose trade header begins with **Trade Date**, showing the aligned instrument, side, size, prices, timestamps, P&L, duration, and commission.
- Additional assets:
  - `rithmic-performance-picker.png`, scene `rithmic-performance-picker` — searchable file-import picker narrowed to **Rithmic Performance** on the Connections surface.
- Omitted candidates:
  - Raw CSV/header screenshot — raw text alone would not prove a successful import and would duplicate the copy.
  - Visible **Trade Date** field in the preview — the product preview does not render that column, so adding one would fabricate evidence; the populated aligned values are the honest UI proof.
