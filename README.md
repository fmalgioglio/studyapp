# StudyApp

StudyApp is a planning platform for students in high school and beyond.

The objective is simple: convert study material (books, notes, topics) into a realistic weekly plan that helps users reach exam dates with stronger preparation and lower stress.

## Why This Project

- Students often know what to study but not how to pace it.
- This app translates workload into concrete weekly effort.
- The roadmap includes AI support for study guidance and content understanding.

## Current MVP Scope

- Health endpoint to verify server and DB connectivity.
- Student creation/update with weekly study capacity.
- Subject creation and listing by student.
- Basic MVP console UI to test end-to-end flows quickly.

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

2. Start local database service

```bash
npx prisma dev
```

3. Apply migrations and generate client

```bash
npx prisma migrate dev --name init_core
npx prisma generate
```

4. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## API Endpoints (MVP)

- `GET /api/health`
- `POST /api/students`
- `GET /api/subjects?studentId=<id>`
- `POST /api/subjects`

## Project Structure

- `src/app/*`: UI pages and route handlers.
- `src/server/db/*`: database client and server-side data access.
- `src/server/http/*`: reusable API response helpers.
- `src/server/validation/*`: request validation schemas.
- `prisma/schema.prisma`: data model source of truth.
- `docs/*`: implementation and workflow documentation.

## Roadmap

1. Exams CRUD and deadlines per subject.
2. Workload estimator (words/tokens to required hours/week).
3. Readiness dashboard (`on track` vs `at risk`).
4. AI study assistant for summaries and question generation.
5. Authentication and multi-user support.

## Contribution

Ideas and feedback are welcome.

If you want to collaborate, open an issue with:
- problem statement
- proposed direction
- expected user impact
