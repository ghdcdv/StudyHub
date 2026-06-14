# Global Student Super-App

Production SaaS rebuild of the student platform. This is a Next.js 15 application with Clerk authentication, PostgreSQL and Prisma storage, Gemini AI routes, Cloudflare R2 uploads, Stripe subscriptions, and a separate WebSocket service for study-group chat.

## Stack

- Next.js 15, TypeScript, Tailwind CSS, Framer Motion-ready
- Clerk authentication
- PostgreSQL with Prisma ORM
- Gemini API via `@google/genai`
- Cloudflare R2 via S3-compatible SDK
- Stripe Checkout and webhooks
- `pgvector` for the AI Knowledge Vault

## Required Environment

Use `.env.example` as the contract for required secrets:

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `GEMINI_API_KEY`
- Cloudflare R2 credentials and bucket
- Stripe keys, webhook secret, and price IDs
- `REALTIME_SECRET`
- `ADMIN_EMAILS`

## Database

1. Install dependencies.
2. Run `npm run prisma:generate`.
3. Run `npm run prisma:migrate`.
4. Apply `prisma/pgvector.sql` to enable the vector extension and HNSW index.

## Local Development

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

For realtime study-group chat:

```bash
REALTIME_PORT=3001 npm run realtime
```

## Production Notes

- Gemini keys are only used in server route handlers.
- R2 uploads are handled server-side or through short-lived signed URLs.
- Stripe webhooks update the local subscription and user plan records.
- Rate limiting is stored in Postgres, not in volatile frontend state.
- Knowledge Vault answers use note embeddings stored in Postgres with `pgvector`.
- Vercel should host the Next.js app. The WebSocket server should run as a separate long-lived Node service or be replaced with a managed realtime provider.
