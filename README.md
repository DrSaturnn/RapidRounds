# RapidRounds

RapidRounds is a rapid-fire retrieval trainer for USMLE Shelf and Step 2 CK. It emphasizes pattern recognition, illness scripts, clinical reasoning, and fast free-response recall.

## Folder Structure

- `app/` - Next.js App Router pages and API routes.
- `components/` - Minimal reusable UI components.
- `hooks/` - Client-side practice session state.
- `lib/` - Prisma client, scoring logic, analytics helpers, and OpenAI client setup.
- `database/` - Database query helpers for app-level data access.
- `prisma/` - Prisma schema and seed data.
- `types/` - Shared TypeScript DTOs.

## Install

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:push
pnpm db:seed
```

Set `OPENAI_API_KEY` in `.env` when you want AI-assisted free-response grading. Without it, RapidRounds uses deterministic accepted-answer matching.

## Database

RapidRounds uses PostgreSQL through Prisma. For production on Vercel with Neon, set `DATABASE_URL` to the Neon pooled Postgres connection string, for example:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
```

Do not use a SQLite `file:` URL in production. After changing `DATABASE_URL`, run:

```bash
pnpm prisma generate
pnpm prisma db push
pnpm prisma db seed
```

## Run Locally

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Continue Building

Good next features:

- Add user authentication and per-user stats.
- Expand question authoring with CSV import or an admin editor.
- Add specialty/topic filters in Practice Mode.
- Store OpenAI grading rationales for review and auditing.
- Add spaced repetition scheduling once enough progress data exists.
