# MangaVault

MangaVault is a Next.js App Router application for searching manga, manhwa, manhua, webtoon, anime, and donghua metadata across multiple public sources.

## Tech stack

- Next.js 16 / React 19
- MongoDB for catalog/content data
- Upstash Redis for distributed rate limiting
- Upstash QStash for background sync workers
- Sharp-backed image proxy for thumbnail resizing

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Populate `.env.local` with the values listed in `.env.example` before testing database-backed or queue-backed flows.

## Useful scripts

```bash
npm run lint       # ESLint
npm run typecheck  # TypeScript no-emit check
npm run build      # Production build
npm run migrate:mongo # One-time MongoDB dedupe/index migration
```

## Required production secrets

- `MONGODB_URI`
- `MONGODB_DB`
- `CRON_SECRET`
- `CSRF_SECRET`
- `IMAGE_PROXY_SECRET`
- `IMAGE_HMAC_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `QSTASH_TOKEN`
- `QSTASH_CURRENT_SIGNING_KEY`
- `QSTASH_NEXT_SIGNING_KEY`

Never commit real `.env*` files. Use Vercel environment variables for production secrets.
