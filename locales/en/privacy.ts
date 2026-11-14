export default {
  privacy: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: 13 November 2026",
    intro: {
      title: "1. Introduction",
      content:
        "Deltalytix, operated by Hugo Demenez (\"we\", \"our\", or \"us\"), is committed to protecting your privacy. This Privacy Policy explains the categories of personal data we collect, the purposes of use, the recipients and processors, how long we keep each category, the controls you have, and how AI apps and Model Context Protocol (MCP) tools use your data. It applies to deltalytix.app, the public API, and the MCP server at https://www.deltalytix.app/api/mcp.",
      controller:
        "Controller: Deltalytix, operated by Hugo Demenez. Contact: contact@deltalytix.app.",
    },
    collect: {
      title: "2. Data collected",
      lead: "We collect only the data needed to provide the journal, analytics, billing, in-app AI, marketing newsletter, and connected-app features. Categories include:",
      account:
        "Account information: email address, name, language, and profile picture URL if you sign in with Google or Discord.",
      trades:
        "Trades you import or enter, including instruments, prices, dates, quantities, PnL, commissions, comments, tags, and screenshots you attach.",
      journal:
        "Journal and mindset entries you write, including mood notes and related journal content.",
      connections:
        "Broker connection metadata such as service, environment, last sync time, and linked account numbers. Broker passwords, API keys, and other secrets are stored only so we can sync your accounts and are never returned through the public API or MCP.",
      billing:
        "Subscription and billing records. Payments are processed by Stripe. We do not store full payment card numbers, government identifiers, or health information.",
      analytics:
        "Usage and measurement data, as described in Analytics and measurement, including IP address and user agent as processed by our hosting and analytics providers.",
      tokens:
        "OAuth grants and personal access tokens you create so third-party apps can access your account. We store a last-used timestamp for each token, not the tool arguments or response bodies.",
      aiChat:
        "In-app AI conversations: messages you send to the dashboard AI assistant and the support assistant, including any images you attach in support chat. Dashboard chat is auto-saved with that day's journal/mood entry and kept until you delete that day's journal/mood entry or delete your account. Using Reset in the chat only clears the on-screen conversation; it does not delete the saved chat for that day.",
      aiFeatures:
        "Data sent to model providers for in-app AI features: journal text you ask the editor to explain or expand; full CSV rows for AI import mapping and formatting (up to 500 rows, in batches of 50 — not only headers and samples); natural-language date search queries; audio you upload for transcription; weekly performance aggregates used to draft the weekly recap; public FAQ questions on the landing page; newsletter subscriber emails sent for name formatting; and, for dashboard chat and analysis tools, trades, journal entries, past conversations, and week summaries returned to the model as tool results.",
      community:
        "Community content you post: posts, comments, and votes.",
      shares:
        "Shared dashboard links you create. Share links are public by default until you change that setting or they expire.",
      teams:
        "Team and business membership: when you join a team or business, managers can view and export traders' trades as part of that product feature.",
      newsletter:
        "Marketing newsletter subscription: email address if you subscribe, until you unsubscribe or delete your account.",
      technical:
        "Technical logs needed to run the service, including structured API/MCP request metadata described under AI apps and MCP tools, and IP address / user agent via hosting and analytics.",
    },
    use: {
      title: "3. Purposes",
      lead: "We use the collected information for these purposes:",
      service:
        "Providing and maintaining our service, including your journal, accounts, and performance analytics",
      notify: "Notifying you about changes to our service and material changes to this Privacy Policy",
      features: "Allowing you to participate in interactive features of our service",
      support: "Providing customer and product support, including the in-app support assistant",
      billing: "Processing subscriptions and sending transactional email",
      newsletter:
        "Sending the marketing newsletter to subscribers who opted in (you can unsubscribe via the link in each newsletter)",
      ai:
        "Powering in-app AI features (dashboard chat, support assistant, journal AI, CSV import helpers, analysis, transcription, weekly recap drafting, newsletter name formatting)",
      connectors:
        "Letting you connect authorized apps and MCP clients to your own data, limited to the scopes you grant",
      improve: "Gathering analysis or valuable information to improve our service",
      monitor: "Monitoring the usage of our service",
      advertising:
        "Measuring advertising and conversions (Google Ads / GA4) where allowed by consent settings",
      security: "Detecting, preventing and addressing technical issues and abuse",
    },
    processors: {
      title: "4. Recipients and processors",
      lead: "We share personal data with the following recipients, each for a limited purpose:",
      supabase:
        "Supabase: authentication, database hosting, and file storage for trade screenshots and journal images.",
      stripe: "Stripe: payment processing and subscription billing.",
      posthog:
        "PostHog: product analytics and measurement, hosted in the European Union. Requests go through deltalytix.app. Events may include page views, product events, and (with consent) session replay. Analytics events are kept for up to the retention configured in our PostHog Cloud EU project (currently up to 7 years).",
      resend:
        "Resend: transactional email such as welcome messages, weekly recaps, support replies, and the marketing newsletter.",
      vercel:
        "Vercel: application hosting, serverless execution, Web Analytics, Speed Insights, runtime logs, and (when used) the Vercel AI Gateway that routes some model requests. Vercel Web Analytics is aggregated and cookieless (visitor hash resets daily); reporting windows follow Vercel’s documented retention (up to 12 months on Pro, up to 24 months with Web Analytics Plus / Enterprise). Speed Insights receives performance metrics. Runtime log retention follows Vercel plan defaults (up to 1 day on Pro, up to 30 days with Observability Plus).",
      google:
        "Google: Google Analytics 4 (GA4) and Google Ads conversions on production. The Google tag loads with Consent Mode; outside EEA/UK/Switzerland, ads consent may default to granted until you opt out. With ads consent outside the EEA banner flow, we may send conversion events (value, currency, transaction id), click identifiers (for example gclid), and enhanced conversions with a SHA-256 hashed email. Accepting ads in the EEA/UK/Switzerland consent banner does not enable hashed-email enhanced conversions. When consent is denied, Google may still receive cookieless Consent Mode pings used for conversion modelling. Retention of Google Analytics and Ads data follows Google's product defaults (GA4 user-level data typically up to 14 months unless configured otherwise).",
      googleSignIn:
        "Google sign-in (and Discord sign-in): identity providers used when you choose those login methods.",
      aiProviders:
        "AI model providers (currently OpenAI, directly via our OpenAI API key and sometimes through the Vercel AI Gateway, and Perplexity for journal “explain” via the AI Gateway). Environment overrides can reroute individual AI tasks to other providers. Providers process prompts and tool context under their API terms; OpenAI’s API terms provide that API inputs are not used to train models by default. We send the prompts and related account context needed for the feature you invoked, as described in Data collected.",
      brokers:
        "Broker and market-data APIs you connect: Tradovate / NinjaTrader, Rithmic, Interactive Brokers, IG, and dxFeed — to sync accounts, fills, and market data you request. DxFeed credentials are also sent to the prop-firm / Volumetrica historical hosts returned by that login (for example Hyperticks or other firm-specific hosts).",
      databento:
        "Databento: instrument symbols and time windows used to compute MAE/MFE and related trade analytics.",
      calcom:
        "Cal.com: scheduling embed on the teams page (and related booking links) so visitors can book a call; Cal.com receives the data needed to show the embed and complete a booking.",
      teams:
        "Team and business managers you join: they can see and export traders' trades within that team or business.",
      publicShares:
        "Anyone with a public share link: shared dashboard views you publish (public by default).",
      community:
        "Other users of the community features: posts, comments, and votes you publish there.",
      authorizedApps:
        "Connected AI apps and other clients you authorize: ChatGPT / OpenAI, Claude / Anthropic, Cursor, Grok, and any other OAuth, personal-token, API, or MCP client. Those apps receive only the data returned by the scopes and tools you grant. Once tool outputs leave Deltalytix, the connected app’s own privacy policy applies to that data.",
      noSale:
        "We do not sell your personal data. We do not share it with third parties except the recipients named in this policy, the apps you authorize, or when the law requires it.",
    },
    retention: {
      title: "5. Data retention",
      lead: "We keep each category only as long as needed for the purposes above:",
      tradesJournal:
        "Trades and journal data stay while your account exists. When you delete your account from Settings, we delete your trades (including related trade analytics and Rithmic protocol fills), journal data, connections, and account information, and we delete your screenshots and journal images from file storage as part of account deletion. We attempt to cancel active Stripe subscriptions and delete the Stripe customer record tied to your email; if Stripe or storage cleanup fails, the failure is logged and the deletion may complete with a partial cleanup warning. Stripe, not Deltalytix, retains invoices and payment records as legally required under Stripe's retention.",
      tokens:
        "OAuth grants and personal access tokens remain until you revoke them in Settings → Connections or delete your account. After revocation, the next API or MCP request is rejected.",
      billing:
        "In our app we delete Subscription rows on account deletion. Stripe keeps invoices and related billing records as legally required. We do not retain a separate long-term billing archive beyond what Stripe holds.",
      analytics:
        "PostHog product analytics: kept for up to the retention configured in our PostHog Cloud EU project (currently up to 7 years). Google Analytics 4 / Ads: up to Google’s product defaults (GA4 user-level data typically up to 14 months). Vercel Web Analytics is aggregated and cookieless, with Vercel’s documented reporting window (up to 12 months on Pro, up to 24 months with Web Analytics Plus / Enterprise). You can opt out of optional browser analytics and ads measurement as described in Analytics and measurement.",
      aiChat:
        "Dashboard AI chat is auto-saved with that day's journal/mood entry and kept until you delete that day's journal/mood entry or delete your account. Resetting the chat UI does not delete the saved conversation. Support chat messages are processed to answer you and are not kept as a separate long-term archive beyond ordinary server logs.",
      logs:
        "We do not keep MCP tool arguments or responses, or public API request/response bodies, in logs or analytics. Data you write through the API (for example POST /api/v1/trades, /imports, or /connections) is saved to your account like data entered in the app. We emit one structured request log line per public API / OAuth / MCP HTTP request (method, route, status, latency, token type, app/client id, hashed user id, optional error code) to Vercel runtime logs. Those lines never include Authorization headers, bearer tokens, or tool argument/response bodies. Vercel runtime log retention is up to 1 day on Pro by default, and up to 30 days with Observability Plus.",
    },
    aiApps: {
      title: "6. AI apps and MCP tools",
      lead: "You can connect third-party AI apps and other clients that use the Deltalytix public API or the MCP server at https://www.deltalytix.app/api/mcp. That includes ChatGPT plugins and apps (OpenAI), Claude connectors (Anthropic), Cursor, Grok, and any other OAuth or personal-token client. We do not receive your conversations with those clients. We only receive the authenticated API or MCP requests they make on your behalf.",
      scopes:
        "Access is limited to the OAuth or personal-token scopes you grant, such as profile:read, accounts:read, trades:read, metrics:read, and connections:read. The public API also accepts write scopes (trades:write, connections:write, imports:write) only if you grant them. MCP tools are read-only and do not expose write operations.",
      tableLead:
        "The following table lists every MCP tool currently registered on the authenticated MCP server. Each tool calls the same server functions as the matching GET /api/v1 route, except get_daily_pnl, which is a projection of GET /api/v1/metrics/equity (not its own route).",
      tableTool: "Tool",
      tableInputs: "Inputs",
      tableOutputs: "Returns",
      tableScope: "OAuth scope",
      access:
        "Tools and API requests only access the signed-in user's own data. There is no cross-user access. A token cannot read another account. Tools never accept a user id as an argument.",
      secrets:
        "Broker credentials, passwords, API keys, and tokens are never returned by the API or by MCP tools (including list_connections).",
      recipient:
        "Tool outputs are sent to the AI app or client you connected (for example ChatGPT / OpenAI, Claude / Anthropic, Cursor, or Grok). That app’s privacy policy then governs how it uses the data it received.",
      logging:
        "We do not store MCP tool inputs or outputs in our database, and we do not send MCP tool payloads to PostHog. We only keep the structured request metadata described in Data retention (logs), plus a last-used timestamp on the access token.",
      revoke:
        "You can revoke connected apps and personal access tokens at any time in Settings → Connections. A revoked token is rejected on the next request.",
      webmcp:
        "Separately, the website may register browser WebMCP helpers (deltalytix.discover_resources and deltalytix.navigate) that only return public discovery URLs or navigate to public pages. They do not read your trading data and do not use your OAuth scopes.",
      inAppAi:
        "In-app AI features (dashboard chat, support assistant, journal AI, CSV helpers including AI import of full row batches, analysis tools that return trades/journal/past conversations/week summaries to the model, transcription, weekly recap, and newsletter name formatting) send prompts and related account context to the currently configured providers (OpenAI and, for journal explain, Perplexity via the Vercel AI Gateway; env overrides can reroute tasks). Providers process that data under their API terms; OpenAI’s API terms provide that API inputs are not used to train models by default. Those features are separate from ChatGPT plugins; they run inside Deltalytix when you use them. Third-party apps with imports:write can also trigger AI import via POST /api/v1/imports with type=ai.",
    },
    cookies: {
      title: "7. Cookies",
      content:
        "We use \"cookies\" to collect information. Cookies are small data files stored on your hard drive by a website. We may use both session cookies (which expire once you close your web browser) and persistent cookies (which stay on your computer until you delete them) to provide you with a more personal and interactive experience on our Site. Necessary cookies keep you signed in and protect the service. Optional product-use cookies (PostHog), advertising cookies (Google Ads / GA4), and related Consent Mode signals are described in Analytics and measurement.",
    },
    analytics: {
      title: "8. Analytics and measurement",
      provider:
        "We use PostHog (EU-hosted product analytics), Vercel Web Analytics and Speed Insights (page and performance metrics on our hosting), and — on production hosts — Google Analytics 4 and Google Ads conversions. PostHog requests go through deltalytix.app so your browser talks to us, not directly to PostHog.",
      beforeConsent:
        "If you visit from the EEA, the United Kingdom or Switzerland — or we cannot tell your country — we show a consent banner. Until you accept, we only collect anonymous, cookieless measurement: page views and funnel counts with no cookies, no localStorage, no stored identifier, and no session replay. Google Consent Mode may still send cookieless pings for conversion modelling when ads consent is denied. Vercel Web Analytics and Speed Insights events are only sent while product-use analytics is allowed.",
      afterConsent:
        "If you accept product use, we may use cookies to recognise your account and record a PostHog session replay, and Vercel Web Analytics and Speed Insights events are gated on that consent. Form inputs and card fields stay masked in every replay. If you accept ads outside the EEA banner’s hashed-email rules, Google may store ads cookies and receive conversion data including hashed email for enhanced conversions, click IDs, value, currency, and transaction id. Accepting ads in the EEA/UK/Switzerland banner does not send a hashed email.",
      otherRegions:
        "If you visit from elsewhere (for example the United States), we measure use by default, and ads consent may default to granted. You can opt out at any time with the “Opt out of analytics” link in the footer or on this page. That opt-out stops browser analytics and ads signals: it turns off PostHog capturing, stops Vercel Web Analytics and Speed Insights events, and denies Google ads storage, ads user data, and ads personalization (as well as analytics storage). Server-side signup, checkout, and purchase records can still continue, and unless you opt out, those server-side conversion events may include your email. Google cookieless Consent Mode pings can also continue. We remember that choice in a cookie.",
      conversions:
        "Account creation, checkout start and a completed subscription are recorded on our servers with a pseudonymous user id so a sale is not lost if a browser blocks scripts. For visitors in the EEA, the United Kingdom or Switzerland we do not attach your email to those server events. Outside the EEA, the United Kingdom or Switzerland, unless you opt out of analytics, those server-side conversion events may include your email. These server-side conversion records are not stopped by the browser analytics opt-out. Google Ads purchase/signup conversions (when ads consent allows hashed email outside the EEA banner rules) may include SHA-256 hashed email, value, currency, and transaction id.",
      vercel:
        "Vercel Web Analytics is aggregated and cookieless; Speed Insights measures performance. Both send events only while product-use analytics is allowed, and stop sending when you opt out (including without a page reload). Retention follows Vercel’s documented reporting windows (up to 12 months on Pro, up to 24 months with Web Analytics Plus / Enterprise).",
      optOut: "Opt out of analytics",
      optedOut: "Analytics opted out",
    },
    security: {
      title: "9. Data security",
      content:
        "We host application data with Supabase (database, authentication, and file storage for screenshots) and the application on Vercel. Traffic is encrypted in transit (HTTPS/TLS). Broker connection credentials are encrypted at rest with AES-256-GCM when an encryption key is configured. Access to production systems is limited to operators who need it to run the service. No method of transmission or storage is fully secure; we work to protect your data with industry-standard controls.",
    },
    legal: {
      title: "10. Legal basis and international transfers",
      basis:
        "Where the GDPR applies, we process personal data on these bases: performance of our contract with you (providing the journal, API, billing, and connected-app features); your consent (optional analytics and ads cookies in the EEA/UK/Switzerland, authorizing third-party apps, and the marketing newsletter — unsubscribe any time); legitimate interests (securing the service, preventing abuse, improving reliability, measuring product use outside consent regions where permitted); and legal obligations. Stripe, not Deltalytix, keeps tax and accounting records for payments as legally required.",
      transfers:
        "We and our processors may process data in the European Union and in other countries, including the United States (for example Vercel hosting, OpenAI, Stripe, Google, and related infrastructure). Where required, we rely on appropriate transfer mechanisms such as the processors’ standard contractual clauses or equivalent safeguards.",
    },
    children: {
      title: "11. Children",
      content:
        "Deltalytix is not directed to children under 16. We do not knowingly collect personal data from anyone under 16. If you believe a child has provided us personal data, contact us and we will delete it.",
    },
    rights: {
      title: "12. User controls",
      lead: "You can access, correct, export, and delete your personal information, and you can control analytics and connected apps:",
      access:
        "Access and update your account, trades, and journal in the dashboard.",
      export:
        "Export trades as CSV from Data management, and export journal/mindset entries as PDF or Word from the mindset tools. For a broader copy of your personal data, email contact@deltalytix.app.",
      delete:
        "Delete your account in Settings. That permanently removes your trades, journal data, storage images, connections, and related account records as described in Data retention.",
      analytics:
        "Opt out of browser analytics and ads measurement with the link on this page or in the footer. That stops PostHog capturing, stops Vercel Web Analytics and Speed Insights events, and denies Google ads storage, ads user data, and ads personalization. Server-side signup/checkout/purchase records and Google cookieless Consent Mode pings may continue. In Settings you can also change cookie consent.",
      revoke:
        "Revoke connected apps and personal access tokens in Settings → Connections.",
      contact:
        "To exercise these rights, or if you have questions, contact contact@deltalytix.app. We comply with the GDPR and other applicable data-protection laws.",
    },
    changes: {
      title: "13. Changes to This Privacy Policy",
      content:
        "We may update our Privacy Policy from time to time. We will notify you of material changes by email to registered users and by posting the new Privacy Policy on this page and updating the \"Last updated\" date.",
    },
    contact: {
      title: "14. Contact Us",
      content:
        "If you have any questions about this Privacy Policy, please contact us at:",
      email: "contact@deltalytix.app",
    },
  },
} as const;
