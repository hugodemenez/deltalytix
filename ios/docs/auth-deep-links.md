# Supabase auth & deep links on iOS

Notes for the Capacitor WKWebView shell loading `https://www.deltalytix.app`.

## How auth works today (web)

1. **Session storage** — Supabase SSR stores session cookies (`sb-*-auth-token`) via `@supabase/ssr` in `server/auth.ts` and `proxy.ts`.
2. **OAuth redirect** — `signInWithOAuth` sets `redirectTo` to `{SITE_URL}api/auth/callback?...` (see `server/auth.ts`).
3. **Callback handler** — `app/api/auth/callback/route.ts` exchanges the `code` for a session and redirects to `/dashboard`.
4. **Magic link** — `signInWithOtp` uses `emailRedirectTo` with the same callback path.
5. **Protected routes** — `proxy.ts` checks Supabase session on `/dashboard` paths.

The iOS shell does **not** implement its own auth — it relies on the hosted web app inside WKWebView.

---

## WKWebView session cookies

Capacitor uses `WKWebView`. When `server.url` points at `www.deltalytix.app`:

- First-party cookies set by the callback route persist in the WebView cookie store.
- `WKWebsiteDataStore.default()` shares cookie behavior with Safari on iOS (ITP may apply to third-party contexts; Deltalytix auth is first-party).

**Test checklist**

1. Sign in with email/password in the simulator → force-quit app → relaunch → should stay signed in.
2. Sign out → cookies cleared → `/authentication` shown.

---

## Custom URL scheme (configured in spike)

`Info.plist` registers:

```
deltalytix://
```

Bundle ID: `app.deltalytix.mobile`

### Supabase dashboard — add redirect URLs

In [Supabase Auth URL configuration](https://supabase.com/dashboard/project/_/auth/url-configuration):

| URL | Use |
|-----|-----|
| `https://www.deltalytix.app/api/auth/callback` | Already used by web (keep) |
| `deltalytix://auth/callback` | Custom scheme return (optional bridge) |
| `https://www.deltalytix.app/**` | Site URL / redirect allow list |

For **Universal Links** (preferred for production):

1. Host `apple-app-site-association` at `https://www.deltalytix.app/.well-known/apple-app-site-association`
2. Enable Associated Domains entitlement: `applinks:www.deltalytix.app`
3. Add `https://www.deltalytix.app/api/auth/callback` to Supabase redirect URLs (already present)

When a magic link or OAuth completion opens `https://www.deltalytix.app/api/auth/callback?...`, iOS can route it into the app instead of Safari.

### Capacitor listener (add when wiring auth bridge)

```typescript
import { App } from "@capacitor/app"

App.addListener("appUrlOpen", ({ url }) => {
  // url: deltalytix://auth/callback?code=... or universal link
  // Navigate WebView: window.location.href = mapped https URL
})
```

For v1 remote-URL mode, Universal Links to `www.deltalytix.app` may open the app automatically without extra JS if Associated Domains are configured.

---

## Google OAuth (embedded WebView blocked)

Google **blocks** OAuth inside embedded WebViews. Deltalytix uses `signInWithOAuth({ provider: 'google' })` in `server/auth.ts`.

**Required pattern for iOS shell:**

1. Intercept navigation to `accounts.google.com` (or open OAuth from a native button).
2. Launch **`ASWebAuthenticationSession`** via `@capacitor/browser` (`Browser.open({ url })`).
3. Complete OAuth in system browser; redirect lands on `api/auth/callback`.
4. Resume app via Universal Link or custom scheme; WebView loads dashboard with session cookie.

Capacitor config already allows navigation to `accounts.google.com` and `*.supabase.co`.

---

## Magic links (email OTP)

Flow: user enters email → receives link → taps in Mail app.

| Step | Behavior |
|------|----------|
| Link opens | Universal Link → app WebView **or** Safari |
| Callback | `api/auth/callback` sets session cookie |
| Return to app | If opened in Safari, user switches back; consider Universal Links so the app captures the callback |

**Open Mailbox** on sign-in screen: `lib/open-mailbox.ts` already resolves iOS deep links (`message://`, `googlegmail://`, etc.) — works inside WKWebView.

---

## Tradovate OAuth (dashboard import)

Callback page: `app/[locale]/dashboard/import/page.tsx` (Tradovate sync).

Ensure `allowNavigation` in `capacitor.config.ts` includes Tradovate OAuth domains when testing import flows. External broker OAuth may need `@capacitor/browser` same as Google.

---

## Stripe / external checkout

Mirror desktop behavior: open payment URLs in **system browser** (`SFSafariViewController` / `@capacitor/browser`), not embedded WebView, for PCI and 3DS compatibility.

---

## Local dev bypass

When `LOCAL_DASHBOARD_AUTH_BYPASS=true` in `.env.local`:

- Web app stubs Supabase client (`server/auth.ts`)
- iOS shell pointed at `http://127.0.0.1:3000/dashboard` skips real OAuth
- **Never** enable bypass in production builds

---

## Security checklist before App Store

- [ ] Associated Domains + `apple-app-site-association` on production domain
- [ ] Supabase redirect URL allow list reviewed
- [ ] No auth bypass env vars in release builds
- [ ] OAuth flows use system browser session
- [ ] ATS: production uses HTTPS only; local dev uses `cleartext: true` in config when needed
