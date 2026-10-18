export default {
  "dashboard.settings.connections": "Connections",
  "dashboard.settings.connections.yourApps": "Your apps",
  "dashboard.settings.connections.yourApps.description":
    "Build a tool other Deltalytix traders can connect to their account. They approve what it can see or do, and can disconnect anytime.",
  "dashboard.settings.connections.howItWorks": "How it works",
  "dashboard.settings.connections.addApp": "Add app",
  "dashboard.settings.connections.manage": "Manage",
  "dashboard.settings.connections.yourApps.empty":
    "Register an app so other traders can connect it to their account.",
  "dashboard.settings.connections.yourApps.emptyExample":
    "For example, build your own journal on the trades Deltalytix already syncs.",
  "dashboard.settings.connections.usersNone": "No users connected",
  "dashboard.settings.connections.usersOne": "1 user connected",
  "dashboard.settings.connections.usersMany": "{count} users connected",
  "dashboard.settings.connections.created": "Created {date}",
  "dashboard.settings.connections.authorizedApps": "Authorized apps",
  "dashboard.settings.connections.authorizedApps.description":
    "Apps you allowed to access your account.",
  "dashboard.settings.connections.authorizedEmpty.title": "No apps connected yet",
  "dashboard.settings.connections.authorizedEmpty.description":
    "When you authorize an app with your Deltalytix account, it shows up here.",
  "dashboard.settings.connections.revoke": "Revoke",
  "dashboard.settings.connections.authorizedOn": "Authorized {date}",
  "dashboard.settings.connections.lastUsed": "Last used {when}",
  "dashboard.settings.connections.lastUsedNever": "Never used",
  "dashboard.settings.connections.lastUsedYesterday": "yesterday",
  "dashboard.settings.connections.lastUsedJustNow": "just now",
  "dashboard.settings.connections.lastUsedMinutes": "{count} minutes ago",
  "dashboard.settings.connections.lastUsedMinute": "1 minute ago",
  "dashboard.settings.connections.lastUsedHours": "{count} hours ago",
  "dashboard.settings.connections.lastUsedHour": "1 hour ago",
  "dashboard.settings.connections.tokens": "API tokens",
  "dashboard.settings.connections.tokens.description":
    "Personal tokens for scripts and automations.",
  "dashboard.settings.connections.createToken": "Create token",
  "dashboard.settings.connections.tokensEmpty.title": "No tokens yet",
  "dashboard.settings.connections.tokensEmpty.description":
    "Create a token to use the Deltalytix API from your own scripts or tools.",
  "dashboard.settings.connections.new": "New",
  "dashboard.settings.connections.copyToken.title": "Copy your new token",
  "dashboard.settings.connections.copyToken.description":
    "This is the only time the full token is shown. Store it somewhere safe.",
  "dashboard.settings.connections.copy": "Copy",
  "dashboard.settings.connections.name": "Name",
  "dashboard.settings.connections.scopes": "Scopes",
  "dashboard.settings.connections.done": "Done",
  "dashboard.settings.connections.revokeApp.title": "Revoke {name}?",
  "dashboard.settings.connections.revokeApp.description":
    "{name} loses access to your account right away. This can’t be undone. To use it again, you’ll need to authorize it again.",
  "dashboard.settings.connections.cancel": "Cancel",
  "dashboard.settings.connections.revokeAccess": "Revoke access",
  "dashboard.settings.connections.revokeToken.title": "Revoke the {name} token?",
  "dashboard.settings.connections.revokeToken.description":
    "Anything using this token stops working right away. This can’t be undone.",
  "dashboard.settings.connections.revokeToken.action": "Revoke token",
  "dashboard.settings.connections.step": "Step {step} of 4 · {label}",
  "dashboard.settings.connections.step.details": "Details",
  "dashboard.settings.connections.step.redirects": "Redirect URIs",
  "dashboard.settings.connections.step.permissions": "Permissions",
  "dashboard.settings.connections.step.credentials": "Credentials",
  "dashboard.settings.connections.add.title": "Add an app",
  "dashboard.settings.connections.add.descriptionBefore":
    "Use this if you’re building a tool for other traders. For your own scripts, an ",
  "dashboard.settings.connections.add.apiToken": "API token",
  "dashboard.settings.connections.add.descriptionAfter": " is simpler.",
  "dashboard.settings.connections.description": "Description",
  "dashboard.settings.connections.optional": "Optional",
  "dashboard.settings.connections.descriptionHint":
    "Shown to people when they approve your app.",
  "dashboard.settings.connections.apiDocs": "API docs",
  "dashboard.settings.connections.continue": "Continue",
  "dashboard.settings.connections.redirects.title": "Redirect URIs",
  "dashboard.settings.connections.redirects.description":
    "Where people return after they approve your app. Add at least one.",
  "dashboard.settings.connections.redirects.label": "Redirect URIs",
  "dashboard.settings.connections.addUri": "Add another URI",
  "dashboard.settings.connections.redirects.hint":
    "Full URLs only. No # fragments and no user:password in the link.",
  "dashboard.settings.connections.back": "Back",
  "dashboard.settings.connections.permissions.title": "Permissions",
  "dashboard.settings.connections.permissions.description":
    "Choose what your app can ask for. Read access is selected by default.",
  "dashboard.settings.connections.read": "Read",
  "dashboard.settings.connections.readCount": "{count} of {total}",
  "dashboard.settings.connections.write": "Write",
  "dashboard.settings.connections.writeHint": "Can change your data",
  "dashboard.settings.connections.permissions.footnote":
    "Traders see these in plain words before they approve.",
  "dashboard.settings.connections.createApp": "Create app",
  "dashboard.settings.connections.ready.title": "{name} is ready",
  "dashboard.settings.connections.ready.description":
    "Use these to connect your app to Deltalytix.",
  "dashboard.settings.connections.clientId": "Client ID",
  "dashboard.settings.connections.clientSecret": "Client secret",
  "dashboard.settings.connections.shownOnce": "Shown once",
  "dashboard.settings.connections.secretCalloutLead":
    "Copy it now, you won’t see it again.",
  "dashboard.settings.connections.secretCalloutBody":
    "We only keep a scrambled version. If you lose it, make a new secret from the app’s settings.",
  "dashboard.settings.connections.details": "Details",
  "dashboard.settings.connections.redirects.manageDescription":
    "Where people return after they approve your app.",
  "dashboard.settings.connections.redirects.manageHint":
    "Use https, or http only for localhost. No # fragments.",
  "dashboard.settings.connections.redirects.oneRequired":
    "At least one redirect URI is required.",
  "dashboard.settings.connections.permissions.manageDescription":
    "What your app can ask connected users for.",
  "dashboard.settings.connections.scopeNoticeLead":
    "Changes apply when users reconnect.",
  "dashboard.settings.connections.scopeNotice.one":
    "Your 1 connected user keeps their current access until they reconnect or you revoke them.",
  "dashboard.settings.connections.scopeNotice.many":
    "Your {count} connected users keep their current access until they reconnect or you revoke them.",
  "dashboard.settings.connections.credentials": "Credentials",
  "dashboard.settings.connections.secretRotated": "Secret last rotated {date}",
  "dashboard.settings.connections.generateSecret": "Generate new secret",
  "dashboard.settings.connections.deleteApp": "Delete app",
  "dashboard.settings.connections.deleteHint.none": "Stops the app from working.",
  "dashboard.settings.connections.deleteHint.one":
    "Disconnects its 1 user and stops the app from working.",
  "dashboard.settings.connections.deleteHint.many":
    "Disconnects all {count} users and stops the app from working.",
  "dashboard.settings.connections.unsaved": "Unsaved changes",
  "dashboard.settings.connections.save": "Save changes",
  "dashboard.settings.connections.delete.title": "Delete {name}?",
  "dashboard.settings.connections.delete.none":
    "This deletes {name}. This can’t be undone.",
  "dashboard.settings.connections.delete.one":
    "This deletes {name} and disconnects its 1 user. Their access stops right away. This can’t be undone.",
  "dashboard.settings.connections.delete.many":
    "This deletes {name} and disconnects its {count} users. Their access stops right away. This can’t be undone.",
  "dashboard.settings.connections.rotate.title": "Generate a new secret?",
  "dashboard.settings.connections.rotate.description":
    "The current secret stops working right away. Update your app with the new one, or connected users can’t sign in through it.",
  "dashboard.settings.connections.rotateDone.title": "Copy your new secret",
  "dashboard.settings.connections.rotateDone.description":
    "This is the only time it’s shown. The old secret no longer works.",
  "dashboard.settings.connections.how.title": "How your app works",
  "dashboard.settings.connections.how.description":
    "Other traders connect your app to their Deltalytix account. You never see their password.",
  "dashboard.settings.connections.how.step1.title": "You register your app",
  "dashboard.settings.connections.how.step1.body":
    "Add it here and get an app ID and secret to put in your code.",
  "dashboard.settings.connections.how.step2.title": "A trader approves it",
  "dashboard.settings.connections.how.step2.before": "They click ",
  "dashboard.settings.connections.how.step2.pill": "Connect with Deltalytix",
  "dashboard.settings.connections.how.step2.after":
    " in your app, see a Deltalytix screen listing exactly what you asked for, and approve.",
  "dashboard.settings.connections.how.step3.title": "Your app gets access",
  "dashboard.settings.connections.how.step3.body":
    "Only to those permissions, and only for that trader. They can disconnect it in their settings anytime.",
  "dashboard.settings.connections.how.example": "Example",
  "dashboard.settings.connections.how.exampleTitle":
    "Build your own journal on Deltalytix",
  "dashboard.settings.connections.how.exampleBody":
    "Deltalytix syncs your brokers and keeps every trade in one place. Your app reads those trades through the API, so you can build your own journal or tool without handling imports or broker sync.",
  "dashboard.settings.connections.how.brokers": "Brokers & files",
  "dashboard.settings.connections.how.sources": "sources",
  "dashboard.settings.connections.how.sync": "sync + storage",
  "dashboard.settings.connections.how.journal": "Your journal",
  "dashboard.settings.connections.how.yourApp": "your app",
  "dashboard.settings.connections.how.exampleLink": "See the example in the docs",
  "dashboard.settings.connections.how.altBefore": "Just automating your own account? ",
  "dashboard.settings.connections.how.useToken": "Use an API token instead.",
  "dashboard.settings.connections.how.oauth": "Uses OAuth",
  "dashboard.settings.connections.how.gotIt": "Got it",
  "dashboard.settings.connections.removeUri": "Remove redirect URI",
  "dashboard.settings.connections.notFound": "App not found.",
  "dashboard.settings.connections.saveFailed": "Could not save changes.",
  "dashboard.settings.connections.createFailed": "Could not create the app.",
  "dashboard.settings.connections.revokeFailed": "Could not revoke access.",
  "dashboard.settings.connections.tokenFailed": "Could not create the token.",
  "dashboard.settings.connections.untitled": "Untitled",
  "dashboard.settings.connections.scope.profileRead": "Read your profile",
  "dashboard.settings.connections.scope.tradesRead": "Read your trades",
  "dashboard.settings.connections.scope.accountsRead": "Read your trading accounts",
  "dashboard.settings.connections.scope.connectionsRead": "Read your broker connections",
  "dashboard.settings.connections.scope.metricsRead": "Read performance metrics",
  "dashboard.settings.connections.scope.tradesWrite": "Create and import trades",
  "dashboard.settings.connections.scope.connectionsWrite":
    "Create connections and trigger syncs",
  "dashboard.settings.connections.scope.importsWrite": "Upload and import trade files",
  "dashboard.settings.connections.consent.canChange": "Can change data",
  "validation.nameRequired": "Name is required.",
  "validation.nameTooLong": "Keep the name under 80 characters.",
  "validation.descriptionTooLong": "Keep the description under 300 characters.",
  "validation.redirectUriRequired": "At least one redirect URI is required.",
  "validation.redirectUrisTooMany": "Add at most 10 redirect URIs.",
  "validation.redirectUriScheme": "Use https, or http only for localhost.",
  "validation.redirectUriInvalid": "Enter a full URL, like https://example.com/callback.",
  "validation.redirectUriFragment": "Full URLs only. No # fragments.",
  "validation.redirectUriUserinfo": "No user:password in the link.",
  "validation.scopesRequired": "Choose at least one permission.",
  "validation.scopeUnknown": "Unknown permission.",
  "validation.nothingToUpdate": "Nothing to update.",
  "dashboard.settings.connections.copied": "Copied",
  "dashboard.settings.connections.copyFailed": "Copy failed",
} as const
