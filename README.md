# Duffle

Duffle is a dark-first marketplace for renting Telegram Gift NFTs by the day. This first build establishes the Next.js/Tailwind foundation, the Prisma data model, seed collections, and an isolated availability engine.

## Run locally

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Generate Prisma Client: `npx prisma generate`
4. Seed: `npm run db:seed`
5. Start: `npm run dev`

## Environment

- `DATABASE_URL` — PostgreSQL connection string
- `MARKETAPP_BASE_URL` — defaults to `https://marketapp.org`; used as an SSRF allow-list for NFT URLs
- Later phases will add S3/R2 credentials, Auth.js secrets, and cron authorization.

## Availability engine

`lib/availability-checker.ts` is server-only in intended usage. It validates the URL host and `/nft/` path, fetches marketapp.org with a timeout, strips markup, and maps known states to `GiftStatus`. Unknown markup and network errors fail closed as `ERROR`; this prevents stale or malformed pages from becoming rentable. The parser is independently unit-tested and can be updated without changing application code.

## Build plan

1. Foundation and schema (current)
2. Design-system primitives and seeded collection browsing
3. Admin authentication and CRUD with GIF uploads
4. Public gift detail and availability-filtered listings
5. Just-in-time re-check rental flow
6. Cron polling, logging, and mobile/motion polish
