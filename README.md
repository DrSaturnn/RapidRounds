# RapidRounds

RapidRounds is an adaptive clinical reasoning engine for USMLE Shelf and Step 2 CK training. It uses free-response clinical decisions, semantic answer matching, Decision Repair, Teach Me More, and adaptive topic progression to help learners practice NBME-style reasoning rather than passively review a question bank.

The canonical product and architecture authority is [docs/PROJECT_CONSTITUTION.md](docs/PROJECT_CONSTITUTION.md). Future RFCs and implementation work should follow that document unless they explicitly propose a constitutional amendment.

## Documentation Hierarchy

- [README.md](README.md) - project entry point, setup, and orientation.
- [docs/PROJECT_CONSTITUTION.md](docs/PROJECT_CONSTITUTION.md) - durable product laws, educational philosophy, and non-negotiable design principles.
- [docs/RAPIDROUNDS_ARCHITECTURE.md](docs/RAPIDROUNDS_ARCHITECTURE.md) - current system architecture overview.
- [rfc/](rfc/) - individual feature and design proposals.

## Folder Structure

- `app/` - Next.js App Router pages and API routes.
- `components/` - Practice, tutor, repair, and learning UI components.
- `hooks/` - Client-side practice session state.
- `lib/` - Prisma client, answer evaluation, tutor content, curriculum graph, adaptive learning helpers, analytics helpers, and OpenAI client setup.
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
- Expand curriculum graph coverage and shelf-filtered views.
- Store OpenAI grading rationales for review and auditing.
- Add deeper spaced repetition scheduling once enough progress data exists.
