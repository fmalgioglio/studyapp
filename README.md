# StudyApp

StudyApp is an adaptive planning platform for students in high school, university, and self-study.

The objective is simple: turn books, notes, slides, and official resources into a clear study plan that helps students prepare better with less chaos.

## Preview

![StudyApp home](docs/readme-assets/home-desktop.png)

![StudyApp demo](docs/readme-assets/studyapp-demo.gif)

Website-ready demo video: [studyapp-demo.mp4](docs/readme-assets/studyapp-demo.mp4)

## What StudyApp Does

- Builds a realistic weekly study plan from the actual material workload.
- Helps students decide what to study today without rethinking the whole week.
- Keeps subjects, study goals, and materials together in one student-first workspace.
- Supports high school, university, and self-study flows in the same product.

## Core Product Areas

- Planner dashboard with goal progress, weekly pacing, and daily study direction.
- Study Today flow with timer-based focus sessions.
- Subjects and goals organized around real student workflows.
- Rights-safe material discovery for official links plus student-provided materials.
- Responsive web app with a path toward installable PWA usage.

## Tech Stack

- `Next.js` (App Router)
- `TypeScript` (strict mode)
- `Prisma` ORM
- `PostgreSQL` (via Prisma local dev server)
- `Zod` for API input validation

## Local Development

1. Install dependencies

```bash
npm install
```

2. Start the local app

```bash
npm run dev
```

3. Open the site

Visit `http://localhost:3000`.

If you need to refresh the local database client after schema changes:

```bash
npx prisma generate
```

## Product Direction

StudyApp is being shaped around a simple idea:

- one place for subjects, goals, and materials
- a calmer daily study flow
- planning that adapts to real workload instead of vague intentions
- visuals that feel closer to a consumer coaching app than an academic admin panel

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
- `docs/interaction-os-skeleton.md`: human-AI operating framework for multi-role collaboration.

## Open-Source Guardrails

- Never commit `.env*` files or machine-local credentials.
- Keep public docs focused on product and setup, not internal testing flows.
- Keep mascot and visual assets under open-source compatible licensing.
- Keep generated QA screenshots and demo artifacts out of git.

## Contribution

Ideas and feedback are welcome.

If you want to collaborate, open an issue with:
- problem statement
- proposed direction
- expected user impact
