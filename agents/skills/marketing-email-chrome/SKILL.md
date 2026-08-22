---
name: marketing-email-chrome
description: Reuse the August 2026 Deltalytix marketing and product-news email chrome lock when sending via Resend or Zeno. Use for latest-release broadcasts, fluid 100% width, hosted images, full-width CTAs, and send/copy rules. Do not originate campaign copy.
---

# Marketing / product-news email chrome

Lock for **Zeno** and anyone sending marketing or product-news mail through **Resend**.

This is the **August 2026 latest-release** chrome: Hugo reviewed it in Hotmail, then on live EN/FR (2026-08-22). Reuse it. Do not invent a new shell.

Do **not** originate campaign copy in this file or in a send. Copy is Shake (EN) / Dumas (FR). Chrome only.

## Scope

Use this lock for Resend broadcasts (latest-release, product news, similar audience mail).

Do **not** copy width or CTA chrome from the weekly recap React Email. `components/emails/weekly-recap.tsx` still uses a **680px** inner table and a green `#EFF5EC` CTA panel from the earlier PR439 Zeno look. That is a different product mail (`newsletter@…`, app unsubscribe URLs). Auth templates live under `supabase/templates/` and are also out of scope.

## Width / mobile

This is the important rule.

Hotmail and iOS scale the **whole letter** down when an inner table is locked at **680px** or **800px**. The result looks skinny. Do **not** set `width="680"`, `width="800"`, or `max-width: 680px` / `800px` on the inner canvas.

- Shell is `width="100%"` / `max-width: 100%`.
- Outer pad is **0**.
- Content pad is about **12px** left and right.
- Desktop screenshots are huge. If `img` `width` is **760+** and the client ignores `max-width`, the canvas zooms out.

### Head

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
```

### Optional mobile CSS

At `max-width: 620px`, target `.email-shell`, `.email-pad`, and `.fluid-img`.

```css
@media only screen and (max-width: 620px) {
  .email-shell,
  .email-pad,
  .fluid-img {
    width: 100% !important;
    max-width: 100% !important;
  }
}
```

### Shell

Table layout only. Inline styles. No flex or grid.

```html
<table class="dm-bg email-shell" width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="width:100%; max-width:100%;">
  <tr>
    <td class="dm-bg" align="center" style="padding:0;">
      <table class="dm-bg" width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="width:100%; max-width:100%;">
        <tr>
          <td class="email-pad" style="padding-left:12px; padding-right:12px;">
            <!-- content -->
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

## Images

Hosted **HTTPS** on `https://www.deltalytix.app/` only. Never CID — MCP payloads are too large.

- Brand marks: `https://www.deltalytix.app/brand/deltalytix-mark.png` and `https://www.deltalytix.app/brand/deltalytix-mark-light.png`, **22px**, dual light/dark swap.
- Screenshots: existing `/updates/…` shots already hosted on that origin. No version names in filenames or copy (no v5 / v6).
- Privacy is often **text-only** when there is no hosted crop. Do not invent a crop.

Content images:

- HTML `width="600"` (not 760+).
- Class `fluid-img`.
- Style: `display:block; width:100%; max-width:100% !important; height:auto !important;`
- `1px` border `#E5E5E5`, radius `6px`.
- **Never** lock `height`.

```html
<img
  class="fluid-img dm-image"
  src="https://www.deltalytix.app/updates/…/existing-shot.png"
  width="600"
  alt=""
  style="display:block; width:100%; max-width:100% !important; height:auto !important; border:1px solid #E5E5E5; border-radius:6px;"
/>
```

## Chrome / CTAs

- Font stack: `Geist, Arial, Helvetica, sans-serif`.
- Table layout, inline styles, no flex/grid.
- Dark mode classes: `dm-bg`, `dm-heading`, `dm-text`, `dm-button`, `dm-button-link`, `dm-image`, `dm-border`.

### Buttons

Dark buttons `#222722`, white **14px / 700**, radius **6px**, **full width** (`table` `width="100%"`, link `display:block; text-align:center`).

Do **not** wrap the last CTA in a green `#EFF5EC` panel (`dm-surface-green`).

Two **identical** CTAs:

1. After the first content block (after the first screenshot, **not** under the H1).
2. After the sign-off.

```html
<table class="dm-button" width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="width:100%;">
  <tr>
    <td class="dm-button" align="center" bgcolor="#222722" style="background-color:#222722; border-radius:6px;">
      <a class="dm-button-link" href="https://www.deltalytix.app/" style="display:block; text-align:center; font-family:Geist, Arial, Helvetica, sans-serif; font-size:14px; font-weight:700; color:#ffffff; text-decoration:none;">
        <!-- CTA label from approved copy -->
      </a>
    </td>
  </tr>
</table>
```

## Send

- From: `Deltalytix <updates@eu.updates.deltalytix.app>`
- Reply-to: `hugo.demenez@deltalytix.app` <!-- pragma: allowlist secret -->
- Greeting EN: `{{{FIRST_NAME|Trader}}}`
- Greeting FR: `{{{FIRST_NAME|trader}}}`
- Unsubscribe: `{{{RESEND_UNSUBSCRIBE_URL}}}`

- Open/click tracking **off** on `eu.updates.deltalytix.app` unless Hugo says otherwise.
- Confirm with Hugo **before any live audience send**. Designed template + his review first.
- Subject should invite open, not restate the H1.

Weekly recap cron uses `newsletter@eu.updates.deltalytix.app` and app unsubscribe links. Do not mix those into this broadcast chrome.

## Copy

- Shake writes EN. Dumas writes FR. Do **not** originate campaign copy.
- Match UI labels (FR **Modifier** / **Ajouter**, not Edit / Add).
- No version names in filenames or copy (no v5 / v6).
