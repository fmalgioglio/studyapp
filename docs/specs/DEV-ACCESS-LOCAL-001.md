# DEV-ACCESS-LOCAL-001

## 1. Task ID

- Task ID: DEV-ACCESS-LOCAL-001

## 2. Problem

- What is broken or missing:
  - Local development access depended on manual API calls and cookie handling instead of a usable browser flow.
  - Session behavior could diverge between `localhost` and `127.0.0.1`.
- Why it matters now:
  - Local auth/bootstrap was blocking normal development and QA entry into the planner.

## 3. Scope

- In scope:
  - add a visible one-click browser dev entry
  - keep `POST /api/auth/dev-bootstrap` working for local development
  - canonicalize local auth traffic to `http://localhost:3000`
  - simplify local setup docs and env guidance

## 4. Out of Scope

- Not in scope:
  - production auth changes
  - auth provider expansion
  - database schema changes

## 5. Files / Layers Affected

- Files/folders to touch:
  - `src/app/*`
  - `src/app/api/auth/dev-bootstrap/route.ts`
  - `src/server/auth/*`
  - `middleware.ts`
  - local dev docs/scripts/env examples
- Layers impacted (UI/API/Service/Auth/Validation/Data):
  - UI
  - API
  - Auth

## 6. Acceptance Criteria

1. [ ] When `DEV_BOOTSTRAP_ENABLED=true`, the homepage and/or login page show a visible `Enter dev app` button that creates a browser session and redirects to `/planner`.
2. [ ] `POST /api/auth/dev-bootstrap` remains local-dev only and `/api/auth/me` returns `200` in the same browser session after the button flow.
3. [ ] Requests to `127.0.0.1:3000` redirect/canonicalize to `localhost:3000` so local cookie/session behavior is not split by hostname.

## 7. Risks

- Dev bootstrap remains a privileged shortcut if the env flag is enabled on a shared machine.
- Local database/schema drift can still break auth bootstrap until migrations are applied.

## 8. Rollback Notes

- Rollback trigger:
  - dev login flow regresses for normal email/password auth or local host redirect loops appear
- Revert steps:
  - revert the dev entry UI/auth helper changes and the canonical host middleware changes
- Data impact notes:
  - may create/update one local dev student record (`dev@studyapp.local`)
