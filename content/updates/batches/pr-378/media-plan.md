# Changelog media plan: pr-378

## dark-localized-link-previews

- Decision: 0 visuals
- Rationale: The entry already names the affected link types, the dark treatment, localization, contrast, and social-client caching caveat. A standalone generated card would show only one locale and one route without demonstrating the cross-surface consistency or the actual unfurl context, so it would be decorative rather than useful evidence.
- Primary/card asset: none
- Additional assets: none
- Omitted candidates:
  - Generated site or Connections preview card — one card cannot substantiate the entry's broader cross-route and locale behavior, and a social-client frame would introduce client-specific presentation that Deltalytix does not control.

## connections-hub-and-streamlined-imports

- Decision: 0 visuals
- Rationale: The finished copy clearly separates connection management from the shorter add/import flow and enumerates the available metadata and actions. An honest overview requires several populated providers and hosted accounts, while the local capture state cannot safely prove provider health, synchronization, or last-trade metadata without realistic connection data; an empty or synthetic overview would underrepresent the feature.
- Primary/card asset: none
- Additional assets: none
- Omitted candidates:
  - Expanded Connections overview — requires populated provider connections and account metadata that are not available as safe capture data.
  - Provider sheet or inline import — would show only one branch of the consolidated workflow and repeat the step-by-step copy.
  - Narrow account rows — responsive alignment alone is secondary polish rather than distinct evidence for this broad entry.

## mobile-widget-info-popovers

- Decision: 0 visuals
- Rationale: The important improvement is interaction and accessibility behavior across tap, keyboard focus, dismissal, positioning, and reduced motion. One static phone screenshot could show placement but not prove those behaviors, while a video of opening and closing a short explanation would mostly restate the concise copy.
- Primary/card asset: none
- Additional assets: none
- Omitted candidates:
  - Phone-sized widget with an open popover — demonstrates only one transient position and not the accessible interaction that makes the change meaningful.

## calendar-events-and-mobile-details

- Decision: 0 visuals
- Rationale: The entry explains both restored event context and the responsive drawer/dialog split directly. A trustworthy combined capture depends on financial-event data for the selected period, and a drawer without a real event would prove only generic responsive layout rather than the complete claim.
- Primary/card asset: none
- Additional assets: none
- Omitted candidates:
  - Mobile day or week drawer — event availability is data-dependent, and a capture without an event would omit half of the entry's outcome.
  - Separate daily and weekly drawers — the two states share the same responsive behavior, so multiple captures would be redundant.

## clearer-localized-account-emails

- Decision: 0 visuals
- Rationale: This is an inbox-delivery and content-completeness fix that is more precise in text. Screenshots from a local mail sink would not represent rendering across mail clients and would add setup chrome rather than product evidence.
- Primary/card asset: none
- Additional assets: none
- Omitted candidates:
  - Authentication or renewal email capture — a mail-sink rendering would be client-specific and cannot demonstrate delivery or locale selection reliably.

## faster-more-reliable-dashboard-navigation

- Decision: 0 visuals
- Rationale: The outcome spans initial rendering, cached shells, imports, navigation, and trade-table pagination. A short local recording would be highly sensitive to cache warmth, machine speed, seeded history size, and network conditions; without a controlled comparison it would imply performance evidence the capture cannot support.
- Primary/card asset: none
- Additional assets: none
- Omitted candidates:
  - Dashboard navigation recording — timing is environment-dependent and an immediate shell is not meaningful without a controlled before/after comparison.
  - Populated first trade-table page — a static table does not show the corrected initial-loading or invalid-page behavior.

## rithmic-protocol-server-sync

- Decision: 0 visuals
- Rationale: The copy already gives the eligibility boundary and complete connection sequence. Meaningful later states require configured Protocol endpoints and entitled test credentials, while a credential form with empty sensitive fields would add little beyond the written steps and could suggest the integration is universally available.
- Primary/card asset: none
- Additional assets: none
- Omitted candidates:
  - System and credential step — an empty form is not evidence that account discovery or synchronization works.
  - Discovered accounts or synchronization progress — cannot be captured safely without entitled credentials and identifiable hosted-account data.

## send-feedback-from-the-dashboard

- Decision: 0 visuals
- Rationale: The compact entry fully describes the navbar action, required message, optional reply email, confirmation, and acknowledgement. A form screenshot would merely duplicate those controls, while a success capture would require stubbing submission and still could not demonstrate email acknowledgement.
- Primary/card asset: none
- Additional assets: none
- Omitted candidates:
  - Open feedback form — the controls are simple and already described, so the image would be decorative.
  - Localized success state — safely stubbing delivery would prove only the transient UI confirmation, not the acknowledgement-email claim.
