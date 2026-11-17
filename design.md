# Design — VERDA

A locked design system for the whole app (storefront + team dashboard). Every page
redesign reads this file before emitting code. Extend or amend this file when the
system needs to grow; do not restyle pages locally.

<!-- Hallmark · pre-emit critique: P4 H4 E4 S4 R5 V4 -->

## Genre
editorial — calm, photo-led fashion retail. Comfortable to look at for a long browse:
low-chroma surfaces, one muted accent, no neon, no full-bleed colour blocks.

## Macrostructure family
- Marketing (home): **Photographic** — one large photo per fold, copy as a small annotation card.
- Listing (category / brand / search / sale / gender): **Catalogue** — uniform 2/3/4-column product grid, filters left.
- Content & utility (product detail, cart, checkout, account, policy, tracking): **Long Document** rhythm — single column of calm cards, hairlines over boxes.
- App (admin dashboard): sidebar workbench, same tokens, no imagery beyond product thumbnails.

## Theme — custom "Linen & Moss"
Tokens live in `src/app/tokens.css` as OKLCH channels (so Tailwind opacity modifiers work).

| Token | OKLCH | Role |
| --- | --- | --- |
| `--paper` | 97.2% 0.008 85 | page (linen) |
| `--card` | 99.2% 0.004 85 | raised card |
| `--surface` | 94.2% 0.012 85 | image wells, panels (sand) |
| `--surface-2` | 90.6% 0.015 80 | deeper sand |
| `--rule` | 88.6% 0.012 80 | hairlines |
| `--ink` | 25.5% 0.008 70 | text, primary buttons (warm charcoal) |
| `--ink-soft` | 49.5% 0.012 70 | secondary text (≥ 4.5:1 on paper) |
| `--accent` | 47% 0.045 145 | moss — links, focus, small dots (< 5 % of a viewport) |
| `--accent-deep` | 37% 0.038 145 | announcement bar, "Best seller" badge, icon tint |
| `--accent-soft` | 93.6% 0.018 135 | quiet highlight |
| `--sale` | 52% 0.095 40 | clay — discounts, errors |
| `--warn` / `--warn-soft` | 52% 0.08 75 / 95.5% 0.03 85 | notices |

Tailwind legacy names map onto these: `brand` → accent, `brand-dark` → accent-deep,
`brand-lime` → sage, `brand-light` → accent-soft, `brand-off` → surface.

Axes: paper band light · display classical-serif · accent chromatic-other (muted green).

## Typography
- Display: **Instrument Serif** 400, roman only (no italic headings anywhere), tracking −0.015em.
- Body / UI: **Plus Jakarta Sans** 400–600.
- Mono: system mono — counters and order IDs only.
- Section heads: serif 34–44 px, no eyebrow/kicker labels (max 1–2 per page, stacked above the heading).
- Hero headline ≤ 7 words, sentence case.

## Iconography
- One library: **Phosphor** via `src/components/icons.tsx` (RSC-safe build). Never import an icon package directly.
- Sizes 16 / 20 / 24 (h-4 / h-5 / h-6), `currentColor`.
- Weight `regular` for UI controls; `duotone` inside `.icon-tile` (sand tile, moss glyph) for service rows and feature lists; `thin` for empty / placeholder states.
- Social marks: Phosphor `WhatsappLogo`, `InstagramLogo`, `TiktokLogo`, monochrome.

## Imagery
- Real product photos uploaded by the team take priority over everything.
- Demo catalogue uses licensed Unsplash photos in `public/samples/` (credits in `public/samples/CREDITS.json`),
  stored with `ProductImage.isSample = true` and always tagged **"Foto contoh"** in the UI.
- No illustrations of products. A product without any photo shows a neutral sand panel with a thin type icon and "Foto segera hadir".
- Never use photos showing a third-party brand logo.

## Spacing & shape
4-pt scale (Tailwind spacing). Section gap 80–112 px. Radii: cards 18–28 px, inputs 12 px, buttons pill.

## Motion
- Easing `--ease-out` cubic-bezier(.16,1,.3,1); hero cross-fade uses `--ease-in-out`.
- Animate opacity / transform only. Hover zoom on photos ≤ 1.04.
- Reduced motion: transitions collapse to ≤ 150 ms, no auto-advancing movement beyond opacity.

## Microinteractions stance
- Silent success + short toast; no celebratory effects.
- Carousel pauses on hover and has an explicit pause button.
- Popup at most once per 3 days, closes on Escape, never on cart/checkout/account.

## CTA voice
- Primary: charcoal pill (`btn-primary`), paper text, verb-first ("Tambah ke Keranjang", "Checkout").
- Secondary: ghost / text link with arrow.
- Destructive: clay pill (`btn-danger`).

## What pages MUST share
Wordmark (serif "VERDA" + moss dot), tokens, fonts, Phosphor icons, CTA voice, "Foto contoh" labelling.

## What pages MAY differ on
Macrostructure within the family above; marketing pages may use larger photography.
