# StudyApp

StudyApp is a planning platform for students in high school and beyond.

The objective is simple: convert study material (books, notes, topics) into a realistic weekly plan that helps users reach exam dates with stronger preparation and lower stress.

## Why This Project

- Students often know what to study but not how to pace it.
- This app translates workload into concrete weekly effort.
- The roadmap includes AI support for study guidance and content understanding.

## Current MVP Scope

- Health endpoint to verify server and DB connectivity.
- Cookie-based authentication (register, login, logout, current session).
- Protected planner area with split feature pages (overview, focus, profile, subjects, exams, estimate).
- Student profile update with weekly study capacity.
- Subject creation and listing for authenticated user.
- Exam creation and listing for authenticated user.
- Stochastic planning estimate with personalized calibration hooks.
- Focus lock timer with XP/streak reward loop.
- Responsive UI flow with dedicated pages instead of a single long console.

## Tech Stack

- `Next.js` (App Router)
- `TypeScript` (strict mode)
- `Prisma` ORM
- `PostgreSQL` (via Prisma local dev server)
- `Zod` for API input validation

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Copy env defaults and enable one-click dev access if you want the browser shortcut

```bash
cp .env.example .env.local
```

Set `DEV_BOOTSTRAP_ENABLED=true` in `.env.local` to show the `Enter dev app` button on `/` and `/login`.

3. Start the app

```bash
npm run dev
```

`npm run dev` starts Prisma local dev if needed and runs Next on `http://localhost:3000`.
Use `localhost`, not `127.0.0.1`, as the canonical local origin.
No Python or `venv` is required for the normal local flow.

4. Open the app

Open `http://localhost:3000`.
If `DEV_BOOTSTRAP_ENABLED=true`, click `Enter dev app` on the homepage or login page to create a browser session and jump to `/planner`.

5. First-run database sync only when needed

```bash
npx prisma migrate dev
npx prisma generate
```

`AUTH_SECRET` is optional in local development because the app falls back to a dev-only secret outside production.

## API Endpoints (MVP)

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/students`
- `GET /api/subjects`
- `POST /api/subjects`
- `GET /api/exams`
- `POST /api/exams`
- `POST /api/planning/estimate`

## Project Structure

- `src/app/*`: UI pages and route handlers.
- `src/server/db/*`: database client and server-side data access.
- `src/server/http/*`: reusable API response helpers.
- `src/server/validation/*`: request validation schemas.
- `prisma/schema.prisma`: data model source of truth.
- `docs/*`: implementation and workflow documentation.
- `docs/ml-maturity-plan.md`: model roadmap from baseline to advanced ML.
- `docs/server-test-flow.md`: end-to-end auth/planner test checklist.
- `docs/interaction-os-skeleton.md`: human-AI operating framework for multi-role collaboration.

## Roadmap

1. Open-source web foundation (privacy-first, reproducible local setup, stable planner workflow).
2. Store-ready mobile app layer (shared logic, platform UI shell, offline-safe focus tracking).
3. Agentic coach layer (adaptive planning agent, proactive nudges, learning loop).

## Privacy And Open-Source Guardrails

- Never commit `.env*` files or machine-local credentials.
- Keep auth/testing shortcuts behind explicit dev-only environment flags.
- Keep public docs free of sensitive account details or personal access data.
- Keep mascot and visual assets under open-source compatible licensing.

## Contribution

Ideas and feedback are welcome.

If you want to collaborate, open an issue with:
- problem statement
- proposed direction
- expected user impact
