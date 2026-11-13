export default {
  privacy: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: 13 November 2026",
    intro: {
      title: "1. Introduction",
      content:
        "Deltalytix (\"we\", \"our\", or \"us\") is committed to protecting your privacy. This Privacy Policy explains the categories of personal data we collect, the purposes of use, the recipients and processors, how long we keep each category, the controls you have, and how AI apps and Model Context Protocol (MCP) tools use your data. It applies to deltalytix.app, the public API, and the MCP server at https://www.deltalytix.app/api/mcp.",
    },
    collect: {
      title: "2. Data collected",
      lead: "We collect only the data needed to provide the journal, analytics, billing, in-app AI, and connected-app features. Categories include:",
      account:
        "Account information: email address, name, language, and Discord profile picture URL if you sign in with Discord.",
      trades:
        "Trades you import or enter, including instruments, prices, dates, quantities, PnL, commissions, comments, tags, and screenshots you attach.",
      journal:
        "Journal and mindset entries you write, including mood notes and related journal content.",
      connections:
        "Broker connection metadata such as service, environment, last sync time, and linked account numbers. Broker passwords, API keys, and other secrets are stored only so we can sync your accounts and are never returned through the public API or MCP.",
      billing:
        "Subscription and billing records. Payments are processed by Stripe. We do not store full payment card numbers, government identifiers, or health information.",
      analytics:
        "Usage and measurement data, as described in Analytics and measurement.",
      tokens:
        "OAuth grants and personal access tokens you create so third-party apps can access your account. We store a last-used timestamp for each token, not the tool arguments or response bodies.",
      aiChat:
        "In-app AI conversations: messages you send to the dashboard AI assistant and the support assistant, including any images you attach in support chat.",
      aiFeatures:
        "Data sent to model providers for in-app AI features: journal text you ask the editor to explain or expand; CSV headers and sample rows for import mapping and formatting; natural-language date search queries; audio you upload for transcription; weekly performance aggregates used to draft the weekly recap; and public FAQ questions on the landing page.",
      technical:
        "Technical logs needed to run the service, including structured API/MCP request metadata described under AI apps and MCP tools.",
    },
    use: {
      title: "3. Purposes",
      lead: "We use the collected information for these purposes:",
      service:
        "Providing and maintaining our service, including your journal, accounts, and performance analytics",
      notify: "Notifying you about changes to our service",
      features: "Allowing you to participate in interactive features of our service",
      support: "Providing customer and product support, including the in-app support assistant",
      billing: "Processing subscriptions and sending transactional email",
      ai:
        "Powering in-app AI features (dashboard chat, support assistant, journal AI, CSV import helpers, analysis, transcription, weekly recap drafting)",
      connectors:
        "Letting you connect authorized apps and MCP clients to your own data, limited to the scopes you grant",
      improve: "Gathering analysis or valuable information to improve our service",
      monitor: "Monitoring the usage of our service",
      security: "Detecting, preventing and addressing technical issues and abuse",
    },
    processors: {
      title: "4. Recipients and processors",
      lead: "We share personal data with the following recipients, each for a limited purpose:",
      supabase: "Supabase: authentication and database hosting.",
      stripe: "Stripe: payment processing and subscription billing.",
      posthog:
        "PostHog: product analytics and measurement, hosted in the European Union. Requests go through deltalytix.app.",
      resend:
        "Resend: transactional email such as welcome messages, weekly recaps, and support replies.",
      vercel:
        "Vercel: application hosting, serverless execution, and (when used) the Vercel AI Gateway that routes some model requests.",
      aiProviders:
        "AI model providers: OpenAI (directly via our OpenAI API key, and sometimes through the Vercel AI Gateway) and Perplexity (journal “explain” via the AI Gateway). We send only the prompts and tool context needed for the feature you invoked.",
      authorizedApps:
        "Connected AI apps and other clients you authorize: ChatGPT / OpenAI, Claude / Anthropic, Cursor, Grok, and any other OAuth, personal-token, API, or MCP client. Those apps receive only the data returned by the scopes and tools you grant. Once tool outputs leave Deltalytix, the connected app’s own privacy policy applies to that data.",
      noSale:
        "We do not sell your personal data. We do not share it with third parties except the recipients named here, the apps you authorize, or when the law requires it.",
    },
    retention: {
      title: "5. Data retention",
      lead: "We keep each category only as long as needed for the purposes above:",
      tradesJournal:
        "Trades and journal data stay while your account exists. When you delete your account from Settings, we delete your trades, journal data, connections, and account information, and we cancel active Stripe subscriptions and delete the Stripe customer record tied to your email.",
      tokens:
        "OAuth grants and personal access tokens remain until you revoke them in Settings → Connections or delete your account. After revocation, the next API or MCP request is rejected.",
      billing:
        "Billing and subscription records may be retained as long as legally required for tax, accounting, and dispute handling, even after account deletion where the law obliges us.",
      analytics:
        "Analytics retention follows the Analytics and measurement section and PostHog’s processing for events we send. You can opt out of optional analytics as described there.",
      aiChat:
        "In-app AI chat and support messages are processed to answer you. We do not keep a separate long-term archive of every prompt beyond what is stored in your account features (for example journal content you save) and ordinary server logs.",
      logs:
        "We do not store MCP or public API tool inputs or outputs in our database. We emit one structured request log line per public API / OAuth / MCP HTTP request (method, route, status, latency, token type, app/client id, hashed user id, optional error code) to our hosting platform logs (Vercel). Those lines never include Authorization headers, bearer tokens, or tool argument/response bodies. Application code does not set a custom log retention period; hosting-platform log retention follows Vercel’s log retention for the project.",
    },
    aiApps: {
      title: "6. AI apps and MCP tools",
      lead: "You can connect third-party AI apps and other clients that use the Deltalytix public API or the MCP server at https://www.deltalytix.app/api/mcp. That includes ChatGPT plugins and apps (OpenAI), Claude connectors (Anthropic), Cursor, Grok, and any other OAuth or personal-token client. We do not receive your conversations with those clients. We only receive the authenticated API or MCP requests they make on your behalf.",
      scopes:
        "Access is limited to the OAuth or personal-token scopes you grant, such as profile:read, accounts:read, trades:read, metrics:read, and connections:read. The public API also accepts write scopes (trades:write, connections:write, imports:write) only if you grant them. MCP tools are read-only and do not expose write operations.",
      tableLead:
        "The following table lists every MCP tool currently registered on the authenticated MCP server. Each tool calls the same server functions as the matching GET /api/v1 route.",
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
        "In-app AI features (dashboard chat, support assistant, journal AI, CSV helpers, analysis, transcription, weekly recap) send the prompts and related account context described in Data collected to OpenAI and, for journal explain, Perplexity via the Vercel AI Gateway. Those features are separate from ChatGPT plugins; they run inside Deltalytix when you use them.",
    },
    cookies: {
      title: "7. Cookies",
      content:
        "We use \"cookies\" to collect information. Cookies are small data files stored on your hard drive by a website. We may use both session cookies (which expire once you close your web browser) and persistent cookies (which stay on your computer until you delete them) to provide you with a more personal and interactive experience on our Site. Necessary cookies keep you signed in and protect the service. Optional product-use and ads cookies are described in Analytics and measurement.",
    },
    analytics: {
      title: "8. Analytics and measurement",
      provider:
        "We use PostHog, hosted in the European Union, to understand how the site is used and whether checkout works. Requests go through deltalytix.app so your browser talks to us, not directly to PostHog.",
      beforeConsent:
        "If you visit from the EEA, the United Kingdom or Switzerland — or we cannot tell your country — we show a consent banner. Until you accept, we only collect anonymous, cookieless measurement: page views and funnel counts with no cookies, no localStorage, no stored identifier, and no session replay.",
      afterConsent:
        "If you accept product use, we may use cookies to recognise your account and record a session replay. Form inputs and card fields stay masked in every replay.",
      otherRegions:
        "If you visit from elsewhere (for example the United States), we measure use by default. You can opt out at any time with the “Opt out of analytics” link in the footer or on this page. We remember that choice in a cookie.",
      conversions:
        "Account creation, checkout start and a completed subscription are recorded on our servers with a pseudonymous user id so a sale is not lost if a browser blocks scripts. For visitors in the EEA, the United Kingdom or Switzerland we do not attach your email to those events.",
      optOut: "Opt out of analytics",
      optedOut: "Analytics opted out",
    },
    legal: {
      title: "9. Legal basis and international transfers",
      basis:
        "Where the GDPR applies, we process personal data on these bases: performance of our contract with you (providing the journal, API, billing, and connected-app features); your consent (optional analytics cookies in the EEA/UK/Switzerland, and authorizing third-party apps); legitimate interests (securing the service, preventing abuse, improving reliability); and legal obligations (tax and accounting records).",
      transfers:
        "We and our processors may process data in the European Union and in other countries, including the United States (for example Vercel hosting, OpenAI, Stripe, and related infrastructure). Where required, we rely on appropriate transfer mechanisms such as the processors’ standard contractual clauses or equivalent safeguards.",
    },
    rights: {
      title: "10. User controls",
      lead: "You can access, correct, export, and delete your personal information, and you can control analytics and connected apps:",
      access:
        "Access and update your account, trades, and journal in the dashboard.",
      export:
        "Export trades as CSV from Data management, and export journal/mindset entries as PDF or Word from the mindset tools. For a broader copy of your personal data, email privacy@deltalytix.app.",
      delete:
        "Delete your account in Settings. That permanently removes your trades, journal data, connections, and related account records as described in Data retention.",
      analytics:
        "Opt out of analytics with the link on this page or in the footer. In Settings you can also change cookie consent.",
      revoke:
        "Revoke connected apps and personal access tokens in Settings → Connections.",
      contact:
        "To exercise these rights, or if you have questions, contact privacy@deltalytix.app. We comply with the GDPR and other applicable data-protection laws.",
    },
    changes: {
      title: "11. Changes to This Privacy Policy",
      content:
        "We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the \"Last updated\" date.",
    },
    contact: {
      title: "12. Contact Us",
      content:
        "If you have any questions about this Privacy Policy, please contact us at:",
      email: "privacy@deltalytix.app",
    },
  },
} as const;
