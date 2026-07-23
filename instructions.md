# MASTER BUILD PROMPT — Duffle

## 0. ROLE & MISSION

You are a senior full-stack product engineer and UI/UX designer. Build a **production-grade web application** — a marketplace where users can **rent Telegram Gift NFTs** (TON blockchain collectibles) by the day, similar in polish and interaction quality to **getgems.io**, but purpose-built for renting instead of buying/selling.

This is not a prototype. Treat it like a funded startup's flagship product: real data layer, real auth, real background jobs, real error states, real empty states, real loading states.

---

## 1. TECH STACK (non-negotiable defaults — swap only if you state a reason)

- **Framework:** Next.js 14+ (App Router, Server Components, Server Actions)
- **Language:** TypeScript throughout, strict mode
- **Styling:** Tailwind CSS
- **Component foundations:** shadcn/ui + Radix primitives (accessible base layer)
- **Motion/visual layer:** Framer Motion, **Aceternity UI** (Bento Grid, 3D Card Effect, Card Hover Effects, Sparkles, Background Beams/Grid, Glowing Stars, Text Reveal), **Magic UI** (Shimmer Button, Marquee, Number Ticker, Animated Beam, Dock, Confetti on successful rent)
  - Note: "coss.com ui" wasn't a library I could verify — if you meant a specific one, swap it in; otherwise **Cult UI** (cult-ui.com) and **Origin UI** (originui.com) are close in spirit (polished, unusual, non-templated primitives) and pair well with Aceternity/Magic UI.
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** Auth.js (NextAuth) — Telegram Login Widget for end users, separate credential-based auth for `/admin`
- **File/GIF storage:** S3-compatible bucket (Cloudflare R2 or AWS S3) with signed upload URLs
- **Background jobs / polling:** a cron worker (Vercel Cron, or a small Node worker with `node-cron`) for periodic availability re-checks
- **Wallet layer (optional but recommended):** TON Connect SDK, since these are TON NFTs — lets users see gift authenticity/provenance and eventually pay in TON
- **State/data fetching:** TanStack Query on the client, Server Actions/Route Handlers on the server

---

## 2. DESIGN LANGUAGE — "NO AI-SLOP" DIRECTIVES

Explicitly avoid the generic AI-generated-app look. Do **not** produce:
- Purple-to-blue gradient hero sections with a floating 3D blob
- Generic centered "Features" grid with emoji icons in circles
- Default Inter-only typography with no hierarchy contrast
- Rounded-everything cards with identical drop shadows and no depth system
- Stock "Get Started" CTA button patterns copied from SaaS templates

Instead, build toward this direction:
- **Dark-first UI** (getgems.io uses a deep charcoal/near-black base, `#0b0b0f`–`#121214` range) with a TON-accent blue (`#0098EA`) used sparingly for primary actions, not everywhere
- **Glassmorphism used deliberately** — frosted panels only on overlays/modals/nav, not on every card (overuse of glass is itself a slop signal)
- **Each collection gets its own accent identity** (see §4) expressed through a subtle glow/border tint on its cards and collection page hero, not a full re-theme
- **Custom type pairing:** a distinctive display face for headings (e.g. a condensed/grotesk face) against a clean workhorse sans for body — not the same font at every weight
- **Micro-interactions with intent:** hover tilt on gift cards (Aceternity 3D Card), price ticking up/down with Magic UI Number Ticker, a satisfying confetti/shimmer moment on successful rent — motion should confirm actions, not just decorate
- **Real photography/GIF-driven cards**, not icon placeholders — the gift's actual GIF is the hero visual of every card
- **Texture over flatness:** faint noise/grain overlay on dark backgrounds, subtle radial vignettes, so panels don't look like flat CSS rectangles

---

## 3. INFORMATION ARCHITECTURE

**Public routes**
- `/` — landing: hero, live stats ticker (gifts available now, avg rental price), collection showcase carousel, trending gifts grid
- `/collections` — all 7 collections as a bento/grid
- `/collections/[slug]` — single collection: filter bar (price range, max rental period, availability), grid of gift cards
- `/gift/[id]` — gift detail: large GIF, price/day, max rentable days, live status badge, rent panel (day picker, computed total), similar gifts
- `/rentals` — logged-in user's active/past rentals
- `/faq`, `/how-it-works`

**Admin routes** (auth-gated, separate layout, no public nav)
- `/admin` — dashboard: total listings, active rentals, revenue estimate, recently added
- `/admin/gifts` — table of all listings (search/filter/sort)
- `/admin/gifts/new` — add gift form
- `/admin/gifts/[id]/edit` — edit gift form
- `/admin/collections` — manage the 7 collections (name, slug, cover art, accent color)

---

## 4. COLLECTIONS (seed data)

Build these 7 collections with distinct accent colors/motifs so the "no AI-slop" per-collection identity actually shows up:

| Collection | Suggested accent | Motif |
|---|---|---|
| Scared Cats | pale yellow/cream | wide-eyed cat silhouette watermark |
| Plush Pepe | swamp green | soft plush-fabric texture on cards |
| Swiss Watch | steel silver / navy | fine hairline dividers, clock-tick micro-animation |
| Durov's Cap | deep red | subtle fabric-stitch border |
| Loot Bag | gold/bronze | coin-shimmer hover effect |
| Voodoo Doll | violet/black | stitched-thread border detail |
| Nail Bracelet | rose gold | thin metallic gradient edge |

Each collection needs: `name`, `slug`, `coverImageUrl`, `accentColor`, `description`, `totalGifts` (derived count).

---

## 5. DATA MODEL (Prisma schema sketch)

```prisma
model Collection {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  accentColor String
  description String?
  coverImage  String
  gifts       Gift[]
  createdAt   DateTime @default(now())
}

model Gift {
  id                String   @id @default(cuid())
  collection        Collection @relation(fields: [collectionId], references: [id])
  collectionId      String
  collectionNumber  Int          // "Collection Number #" from admin panel
  pricePerDay       Decimal
  maxRentableDays   Int
  gifUrl            String
  marketAppUrl      String       // e.g. https://marketapp.org/nft/EQB.../?to=rent
  status            GiftStatus @default(CHECKING)
  statusMessage     String?      // raw note scraped, e.g. cooldown text
  lastCheckedAt     DateTime?
  isListedOnSite    Boolean  @default(false) // derived: true only if status == FOR_RENT
  rentals           Rental[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

enum GiftStatus {
  FOR_RENT
  COOLDOWN
  RENTED
  UNAVAILABLE
  CHECKING
  ERROR
}

model Rental {
  id        String   @id @default(cuid())
  gift      Gift     @relation(fields: [giftId], references: [id])
  giftId    String
  userId    String
  days      Int
  totalPrice Decimal
  startAt   DateTime
  endAt     DateTime
  createdAt DateTime @default(now())
}

model AdminUser {
  id           String @id @default(cuid())
  email        String @unique
  passwordHash String
}
```

---

## 6. THE CORE ENGINE — marketapp.org AVAILABILITY CHECKER

This is the most important non-UI piece of the product. Build it as an isolated, testable service (`lib/availability-checker.ts`), not scattered inline logic.

**Input:** a gift's `marketAppUrl`, e.g.
`https://marketapp.org/nft/EQB2nzMr424M5ko7HevTrdnLFao0vOCdktgxD7z8aA-2jGmk/?to=rent`

**Logic:**
1. Server-side fetch the page (never client-side — avoids CORS issues and hides the scraping mechanism from end users).
2. Parse the resulting HTML/DOM for the rental status indicator on that page.
3. Map the parsed text to an internal `GiftStatus`:
   - Page shows **"For Rent"** → `FOR_RENT` → `isListedOnSite = true` → gift appears and is rentable on our site.
   - Page shows a note matching **"This gift was listed for rent less than 24 hours ago."** (or equivalent cooldown language) → `COOLDOWN` → `isListedOnSite = false` (visible in admin only, hidden or shown-but-disabled on the public site).
   - Page shows **rented/unavailable** indicators → `RENTED` or `UNAVAILABLE` → `isListedOnSite = false`.
   - Fetch fails or page structure doesn't match any known state → `ERROR`, keep last known status, flag for admin review, don't silently mark it available.
4. Store `status`, `statusMessage` (raw matched text), and `lastCheckedAt` on the `Gift` row.

**When to run the check:**
- **On admin create/edit** of a gift (immediate check before it can go live).
- **On a scheduled interval** (e.g. every 5–10 minutes) via a cron job, batched across all active gifts, with concurrency limits and exponential backoff on failures.
- **Just-in-time, right before checkout** — re-verify the specific gift's status the moment a user clicks "Rent Now" so a stale cache can never let someone rent an already-unavailable gift. If the just-in-time check disagrees with the cached status, block the rental, update the cache, and show the user a friendly "this gift just became unavailable" message with a link back to the collection.

**Engineering considerations to actually implement, not just mention:**
- Cache aggressively (5–10 min TTL) and rate-limit outbound requests to marketapp.org — don't hammer their servers on every page view.
- Wrap the fetch/parse in a resilient adapter (`parseMarketAppStatus(html): { status, message }`) so if marketapp.org changes their markup, you fix one function, not the whole app.
- Log parse failures distinctly from network failures so admins can tell "site is down" apart from "our parser broke."
- Before relying on scraping long-term, check whether marketapp.org exposes any official API/webhook — note this as a TODO/config flag (`USE_OFFICIAL_API_IF_AVAILABLE`) so it's a one-line swap later.

**Public-site filtering rule (hard requirement):**
A gift is only ever rendered as rentable on the public site if `status === FOR_RENT`. Gifts in `COOLDOWN`, `RENTED`, `UNAVAILABLE`, or `ERROR` must never show a working "Rent" button — either hide them from public listings entirely, or show them grayed-out with a status badge ("In cooldown," "Currently rented"), depending on the product decision you make (default to **hide from public grid, visible only in admin**, since that matches the brief).

---

## 7. ADMIN PANEL — FIELD SPEC

Add/Edit Gift form must capture exactly:
1. **Collection** (select from the 7 collections)
2. **Collection Number #** (integer, e.g. #142)
3. **Price per Day** (decimal, currency — TON or USD, your call, but label clearly)
4. **Max Rentable Period (days)** (integer)
5. **GIF upload** (drag-and-drop, preview inline, upload to bucket, store resulting URL)
6. **marketapp.org link** (URL field, validated against the `marketapp.org/nft/...` pattern; on submit, immediately trigger the availability checker and show the resulting status live in the form before saving)

Admin table view: sortable/filterable by collection, status, price, last-checked time, with a manual "Re-check now" action per row and a bulk re-check action.

---

## 8. RENT FLOW (public site)

1. User browses `/collections/[slug]`, sees only gifts where `isListedOnSite = true`.
2. Clicks a gift → `/gift/[id]` detail page: GIF hero, price/day, max days slider/stepper (capped at `maxRentableDays`), live-computed total (Magic UI Number Ticker animating the total as days change).
3. Clicks "Rent Now" → server action re-verifies availability just-in-time (§6) → if still available, creates a `Rental` record, shows a success state (confetti + summary), and — if wallet integration is in scope — routes to TON Connect payment; otherwise a placeholder checkout/payment step.
4. If it just became unavailable → friendly inline message, no dead-end error page, redirect suggestion to similar gifts in the same collection.

---

## 9. MOBILE REQUIREMENTS

- Fully responsive from 360px up; this is explicitly meant to feel as smooth as getgems.io's mobile experience.
- Bottom tab bar on mobile (Home / Collections / My Rentals / Profile) instead of a squeezed top nav.
- Swipeable gift GIF/detail carousels (native touch, not click-only arrows).
- Consider building it Telegram-Mini-App-compatible (`@telegram-apps/sdk` or Telegram WebApp JS API) since the product's whole premise is Telegram Gifts — this lets it live inside a Telegram bot as a Mini App down the line. Flag as a stretch goal if time-constrained, but structure the auth/theme layer so it's not a rewrite later (e.g. respect `window.Telegram.WebApp` theme params when present).

---

## 10. NON-FUNCTIONAL REQUIREMENTS

- **Auth/security:** admin routes behind real session auth + role check, not a hidden URL; rate-limit the marketapp.org checker endpoint and any public API routes; validate/escape all admin-entered URLs before fetching server-side (SSRF guardrails — restrict outbound fetches to the `marketapp.org` host only).
- **Performance:** image/GIF lazy-loading, skeleton loaders matching final layout (no layout shift), route-level code splitting.
- **SEO:** proper metadata per collection/gift page, OG images generated from the gift GIF's first frame or a static fallback.
- **Accessibility:** all interactive cards keyboard-navigable, status badges not color-only (icon + text), motion respects `prefers-reduced-motion`.
- **Empty/error states:** designed, not default browser text — "No gifts currently available in this collection" with a subtle illustration, not a blank grid.

---

## 11. BUILD ORDER (tell the agent to follow this sequence)

1. Scaffold Next.js + TypeScript + Tailwind + shadcn/ui; set up Prisma schema and seed the 7 collections.
2. Build the design system first (colors, type scale, base card/button components) before any real page — this is what prevents the generic-template look.
3. Implement the availability-checker service in isolation with unit tests against sample HTML fixtures (For Rent / Cooldown / Unavailable).
4. Build admin panel CRUD + auth.
5. Build public collection/gift pages wired to real data, filtered by `isListedOnSite`.
6. Build the rent flow with just-in-time re-verification.
7. Layer in Aceternity/Magic UI motion polish and mobile responsiveness last, once the functional core works.
8. Add cron job for periodic re-checks; add logging/monitoring around the checker.

---

## 12. DELIVERABLE

Produce a working repository with: `/app` routes as above, `/lib/availability-checker.ts`, `/prisma/schema.prisma`, `/components` (design-system primitives + Aceternity/Magic UI wrappers), seed script for the 7 collections with a handful of sample gifts per collection, and a `README.md` explaining setup, env vars (DB URL, bucket keys, `MARKETAPP_BASE_URL`), and how the availability engine works.
