# Supabase Auth email templates

The hosted Supabase project does not load these files automatically. They are the
version-controlled source for the values pasted into **Authentication → Emails →
Templates → Magic Link** in the Supabase dashboard.

- Subject: `magic-link-subject.txt`
- Body: `magic-link.html`

The template defaults to English and renders French when
`user_metadata.language` is `fr`. The application passes this metadata when it
requests a Magic Link and keeps it synchronized after authentication.

After publishing the template, send controlled requests from both
`/en/authentication` and `/fr/authentication`. Confirm the subject, copy, Magic
Link, and OTP, then check Auth logs for template parsing errors.
