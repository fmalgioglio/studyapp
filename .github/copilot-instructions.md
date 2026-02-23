# Copilot Instructions for StudyApp

This file exists to help AI agents get productive quickly.  It's intentionally
concise and assumes prior knowledge of TypeScript, Next.js, Prisma, and
common web patterns.

## 🧱 Project Overview

- **Next.js 13** using the **app router** (`src/app`).  Components and pages
  live under `app/`.  API route handlers use the new `route.ts` format and
  export HTTP method functions (e.g. `export async function GET(...)`).
- **Prisma + PostgreSQL** for persistence.  Schema is at `prisma/schema.prisma`;
  generated client lands in `src/generated/prisma` (do **not edit** generated
  files).  Client is instantiated in `src/server/db/client.ts` and cached
  globally in development.
- `src/server` is intended for backend logic – repositories, services,
  helpers – though the current repo has only the `db/client.ts` file.
- Front‑end CSS uses **Tailwind** via `app/globals.css`.
- Routes and other TypeScript modules use absolute imports with the `@/` alias
  (configured in `tsconfig.json`).

## 📁 Key Directories

```
src/
  app/            # Next.js app router code
    api/          # Route handlers returning NextResponse
    globals.css
    layout.tsx
    page.tsx      # root landing page
  generated/      # Prisma client + types (auto‑generated)
  server/         # backend logic (db, repos, services)
shared/           # cross‑cutting helpers or types (empty today)
prisma/           # schema.prisma and migration history
tests/            # unit/ and integration/ subfolders (currently empty)
```

## 🔁 Developer Workflow

1. **Install dependencies**: `npm install` (any package manager works).
2. **Run dev server**: `npm run dev` (alias `yarn dev`, `pnpm dev`, `bun dev`).
3. **Build / start**: `npm run build && npm run start`.
4. **Lint**: `npm run lint` uses ESLint with `eslint-config-next` + Prettier.
5. **Database**:
   - Edit `prisma/schema.prisma` and then run
     `npx prisma migrate dev` (or `prisma db push` for proto work).
   - Regenerate client: `npx prisma generate` (usually automatic after migrate).
   - Health endpoint exists at `/api/health` to verify DB connectivity.
6. **Testing**: Vitest is installed but no test scripts exist yet.  Aim to put
   tests under `tests/unit` or `tests/integration` and invoke via
   `npx vitest` or by adding a `test` script to `package.json`.

> ⚠️ Environment variables (e.g. `DATABASE_URL`) are expected in a
> `.env` file at the project root.  Agents should not hard‑code credentials.

## 💡 Conventions & Patterns

- **API routes**: look at `src/app/api/subjects/route.ts` as the canonical
  pattern.
  - Use `zod` for request validation (`safeParse` & return 400 JSON on failure).
  - Use `NextResponse.json(...)` to build responses with status codes.
  - Catch Prisma errors; handle `PrismaClientKnownRequestError` codes (e.g.
    `P2002` for unique constraint violations) with friendly messages.
  - Use `import { prisma } from "@/server/db/client"` to run queries.
- **Types** come from the generated Prisma client (`import type { Student }` …).
- **Error handling** always returns JSON objects with `error` and optional
  `details` fields.
- Follow existing schema indexes and relations when writing queries.
- Keep business logic out of route handlers; they should validate, call a
  service, and respond.  `src/server/services` is the future home for that logic.
- File names are lower‑kebab or camelCase as shown (`route.ts`,
  `client.ts`).
- Avoid mutating `src/generated/prisma/*` — regenerate from schema instead.

## 🚧 TODO / Known Gaps

- Authentication is planned via `next-auth` (dependency already added) but
  not yet wired up; routes are currently unauthenticated.
- Tests directories are empty; add unit/integration tests using Vitest.
- `shared/` and `services/` are scaffolds for future business logic.

## 🧪 Examples for Agents

- **List subjects**: GET `/api/subjects?studentId=<id>`; handler uses
  `prisma.subject.findMany({ where: { studentId }, orderBy: { createdAt: "asc" }, select: {...} })`.
- **Create subject**: POST `/api/subjects` with JSON payload
  `{ studentId, name, color? }`.
- **Health check**: GET `/api/health` runs a raw `SELECT 1` query.

> ⚠️ When generating new routes, remember to export only the HTTP methods
> you need (GET/POST/PUT/DELETE) and replicate the zod‑validation pattern.

## 🛠️ Additional Notes

- Code targets modern browsers/Node (ES2017, `module: "esnext"`).
- Use `@testing-library/react` and `@testing-library/jest-dom` once frontend
  tests exist.
- Prisma enums `StudySourceType` and `SessionStatus` are used throughout and
  mirror DB enum names exactly.
- No custom ESLint rules; the project relies on Next.js defaults plus
  Prettier.

If anything above is unclear or missing, please point it out so I can
improve this guidance!