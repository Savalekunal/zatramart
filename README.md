# ZatraMart

A farmer-direct agricultural marketplace for India — buyers and farmers trade produce and supplies without middlemen, alongside a daily-labour marketplace, a peer-to-peer used-equipment classifieds section, and a government-schemes explainer. Static front end, [Supabase](https://supabase.com) backend, fully localized in four languages.

**Live site:** https://savalekunal.github.io/zatramart/

## What's in the box

| Module | Pages | What it does |
|---|---|---|
| **Shop** | `shop.html`, `product.html` | Full product catalog — category/rating/discount/seller filters, sort, product detail pages with reviews, delivery-pincode check, similar/recently-viewed rails |
| **Cart & Checkout** | `checkout.html`, `orders.html` | Address → payment → confirmation flow (Cash on Delivery live; Card/UPI shown as "Coming Soon"), order history with a 5-step tracking timeline |
| **Bazaar** | `bazaar.html` | Peer-to-peer classifieds for used farm equipment — Sale/Rent modes, category browsing, photo-backed listings, an image lightbox, and a "Post an Ad" flow |
| **Majdoor** | `majdoor.html` | Daily-labour marketplace — worker directory with skills/rates/ratings, job postings, worker self-registration, and a review system |
| **Yojana** | `yojana.html` | Government agricultural scheme explainer — eligibility, application procedure, required documents |
| **Gyan** | `gyan.html` | Short-form farming knowledge videos/reels |
| **Seller tooling** | `become-seller.html`, `add-product.html`, `my-listings.html`, `store.html` | Store setup, product listing, and a seller dashboard covering all of a seller's Bazaar/Shop/Majdoor listings and buyer enquiries in one place |
| **Auth** | *(shared modal on every page)* | Mobile + name signup, email-OTP verification (via Supabase), login, guest browsing with a queued "do this after you log in" action |

## Tech stack

- **Front end** — plain HTML/CSS/JavaScript. No framework, no build step, no bundler — every page is served exactly as written.
- **Backend** — [Supabase](https://supabase.com): Postgres for listings/orders/profiles/reviews, Auth for OTP-based sign-in, Storage for uploaded photos. Client setup lives in [`assets/js/supabase-client.js`](assets/js/supabase-client.js); table/policy definitions live in [`supabase/`](supabase).
- **Localization** — a small hand-rolled i18n engine ([`assets/js/i18n.js`](assets/js/i18n.js)) with no external dependency. Every user-facing string is looked up by key and applied to the DOM via `data-i18n` attributes; four full dictionaries live in [`assets/locales/`](assets/locales).
- **Hosting** — static files served directly by GitHub Pages from this repository, no CI build step required.

## Project structure

```
zatramart/
├── index.html                # each top-level page lives at the repo root —
├── shop.html                 #   required so GitHub Pages URLs match exactly
├── product.html              #   what's already linked/bookmarked (e.g.
├── checkout.html             #   /zatramart/shop.html)
├── orders.html
├── bazaar.html
├── majdoor.html
├── yojana.html
├── gyan.html
├── store.html
├── become-seller.html
├── add-product.html
├── my-listings.html
│
├── assets/
│   ├── css/
│   │   ├── style.css         # base styles shared by every page
│   │   ├── product.css       # product detail page
│   │   └── flow.css          # multi-step forms (checkout, become-seller, add-product)
│   ├── js/
│   │   ├── common.js         # header, cart drawer, auth modal — shared by every page
│   │   ├── i18n.js           # localization engine
│   │   ├── data.js           # static catalog data (categories, farm types, crops)
│   │   ├── supabase-client.js
│   │   └── <page>.js         # one file per page, e.g. shop.js, checkout.js, bazaar.js
│   └── locales/
│       ├── en.json           # English (default)
│       ├── hinglish.json     # Romanized Hindi-English mix
│       ├── mr.json           # Marathi
│       └── hi.json           # Hindi
│
├── supabase/                 # SQL schema — run these against a Supabase project
│   ├── schema.sql
│   ├── schema_listings.sql
│   ├── schema_seller_profile.sql
│   ├── schema_worker_profile_fields.sql
│   ├── schema_worker_reviews.sql
│   ├── schema_product_reviews.sql
│   ├── schema_job_post_images.sql
│   ├── schema_email_lookup.sql
│   └── schema_seller_profile_delete.sql
│
└── serve.json                # local dev server config (see below)
```

**Why the pages stay at the repo root:** GitHub Pages serves this repo's files at their literal path — `shop.html` is reachable at `/zatramart/shop.html`. Moving pages into a subfolder would change every one of those URLs and break anything already linking to the live site, so only the *supporting* code (CSS/JS/locale files) was grouped under `assets/`.

## Running locally

No build step — just serve the folder and open it.

```bash
npx serve .
```

`serve.json` at the repo root disables clean URLs and rewrites `/` to `/index.html`, matching how the site is meant to be browsed. Open the printed local URL (typically `http://localhost:3000`).

## Localization

Every user-facing string is looked up through `window.KM_I18N.t('some.key')` and applied via `data-i18n="some.key"` (or `data-i18n-placeholder` / `data-i18n-aria-label` / `data-i18n-html` for attributes). Switching the language dropdown in the header re-renders the whole page instantly — no reload — by re-applying every `data-i18n` attribute and firing a `km:langchange` event that each page's own script listens for to re-render dynamic content (product grids, cart totals, order-tracking labels, etc.).

The selected language persists in `localStorage` (`km_lang`) and defaults to English for first-time visitors.

To add or change a translation: edit the matching key in all four files under `assets/locales/`. A key missing from the active locale falls back to English; a key missing everywhere renders as its raw dotted name — a quick way to spot a gap by eye while testing.

## Database

The `supabase/*.sql` files define the schema this app expects — tables for profiles, products, Bazaar/Majdoor listings, orders, reviews, and the row-level security policies that scope each user to their own data. Run them in order against a fresh Supabase project, then point `assets/js/supabase-client.js` at that project's URL and anon key.

## Caching

Every `<script>`/`<link>` tag for a file under `assets/` carries a `?v=N` query parameter (e.g. `assets/js/common.js?v=38`). GitHub Pages caches static assets aggressively, so **any time you change a file under `assets/`, bump its version number on every page that references it** — otherwise returning visitors keep serving the stale cached copy.
