# Day 1 Workflow Cheat Sheet

## Start Development

Run these in separate terminals from the project root:

```powershell
npm run dev
```

```powershell
npx prisma dev
```

## Daily Commands

```powershell
# After editing Prisma models
npx prisma migrate dev --name <change_name>

# Regenerate typed DB client (safe to run anytime)
npx prisma generate

# Lint
npm run lint
```

## Mental Model

- `src/app/*`: pages and API routes.
- `src/server/*`: server-only logic (DB, repositories, services).
- `prisma/schema.prisma`: source of truth for the database structure.
- `src/generated/prisma/*`: generated code, never edit manually.

## First API Endpoints

- `GET /api/health`: basic server/DB health check.
- `GET /api/subjects?studentId=<id>`: list subjects for a student.
- `POST /api/subjects`: create a new subject.

## Common Troubleshooting

- `P1001 Can't reach database`: start `npx prisma dev` first.
- `npm.ps1 execution policy error`: use PowerShell execution policy fix or run in `cmd.exe`.
- Prisma model changes not reflected: run `npx prisma generate`.
