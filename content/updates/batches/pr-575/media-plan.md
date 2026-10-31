# Changelog media plan: pr-575

## api-docs-try-this-route

- Decision: 0 visuals
- Rationale: Both claims are states a still cannot prove honestly. A loaded **Try this route** panel with **Send** looks like the playground [Deltalytix now has a public API, with OAuth apps and developer docs](/en/updates/public-api-oauth-developer-docs) already described, and it cannot show that the old “not in the OpenAPI document” message is gone. The token claim is that the new secret stays readable beside **Copy**; photographing a docs token or a demo token would publish a credential, and blurring or substituting the value would hide the claim. Copy already names the exceptions that still have no **Send** button.
- Primary/card asset: none
- Additional assets: none
- Omitted candidates:
  - Route guide with **Try this route** open (method, path, **Send**) — a working panel does not prove the lookup fix, and one **Send** button would cover `/oauth/authorize`, multipart uploads, and form-encoded bodies, which still cannot be sent from the panel.
  - Token sheet after **Generate docs token** or **Use demo token**, secret visible beside **Copy** — both values are credential-shaped. The sheet stays open only while that secret is on screen.
  - Existing scene `docs-api-overview` (`public-api-docs.png` from pr-543) — full docs landing, not the try panel and not the token sheet.

## api-docs-try-with-ai

- Decision: 1 visual
- Rationale: The change is a location: a new header row under the introduction, with **Try it with AI** / **Essayer avec l’IA** and three labeled buttons. One tight crop shows that row in both locales. The prefilled prompt and the new-tab destinations stay in the copy. A second frame would repeat the same buttons, and a video would only play a static row.
- Primary/card asset: `docs-header-try-with-ai.png` — new scene `docs-header-try-with-ai`. Desktop 1440×900, `/{locale}/docs`, no click. Wait for the header `role="group"` whose buttons are **Claude**, **ChatGPT**, and **Grok**, then clip only that group and its label. EN label **Try it with AI**. FR label **Essayer avec l’IA**. Claim: the docs header offers those three assistants together. Does not include the page title, the guides, or the OpenAPI section.
- Additional assets: none
- Omitted candidates:
  - Claude, ChatGPT, or Grok tabs — third-party pages; the prompt is not a Deltalytix screen.
  - Existing scene `docs-api-overview` — full docs landing from pr-543, not a tight crop of this header row.
  - A second crop of the same row, or a click-through video — one static state is the whole visible claim.

## oauth-consent-use-another-account

- Decision: 0 visuals
- Rationale: The outcome is a sign-out that returns to this same authorization request. A still of **Use another account** / **Changer de compte** under the email only restates the label. A recording under local dashboard bypass would sign back in as the same user, so it would not show an account switch. The consent card’s scopes and approve actions are the earlier OAuth story, left as text in pr-543.
- Primary/card asset: none
- Additional assets: none
- Omitted candidates:
  - Consent card with the email and the underlined link — location of a label the paragraph already names; it does not show the return target. The seeded “Seed Chart Companion” client would fill the card with unrelated scope chrome.
  - Sign-out, then sign-in, then the same consent screen — the behavior that matters, and the local bypass cannot show a different account.
  - Dashboard settings — the link is absent there; an empty settings crop would not prove the consent control.

## new-connections-daily-end-of-day-sync

- Decision: 0 visuals
- Rationale: The change is a default applied when a connection row is created. The schedule picker, including **After close** / **Après clôture**, is already published on [Set the right synchronization rhythm for each connection](/en/updates/flexible-connection-sync-schedules) (`connection-sync-intervals.png`, `connection-sync-daily.png`, `connection-sync-mobile.png`). A new still of that picker would not show that only new Tradovate, DxFeed, Rithmic Protocol, Interactive Brokers, and IG rows receive the default, or that existing manual connections stay manual. A fresh broker connection needs a live provider.
- Primary/card asset: none
- Additional assets: none
- Omitted candidates:
  - Connections schedule menu on **After close** — repeats the earlier daily-preset screenshots and cannot show “new connections only.”
  - A newly created provider row with a next-sync time — would require a live broker login. Do not invent the row.

## rithmic-split-order-sizes

- Decision: 0 visuals
- Rationale: The fix is what sync does not store: the wrong size when history and the live replay disagree, and a second copy of contracts already in the journal. A trade table still shows rows that remain; it cannot show the dropped pieces or the skipped duplicate. There is no new control. Staging before-and-after rows, or photographing a private Rithmic account, would invent or expose the evidence.
- Primary/card asset: none
- Additional assets: none
- Omitted candidates:
  - Journal or trade table after a Protocol sync — cannot show an absent duplicate or a size that was not overwritten.
  - Before/after pair of the same order — would require fabricating the bad fill pattern.
  - Customer Rithmic fills — private account data.
