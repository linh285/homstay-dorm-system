# HomeStay Dorm — Codex Instructions

## Read first

Before working, read:

- docs/00-source-of-truth.md
- docs/01-scope.md
- docs/02-roles-permissions.md
- docs/03-business-workflows.md
- docs/04-business-rules.md
- docs/05-state-machines.md
- docs/06-erd.md
- docs/07-ui-wireframes.md
- docs/08-api-contract.md
- docs/09-error-codes.md
- docs/10-test-cases.md

For an assigned member module, also read its file in:

- docs/assignments/

## Stack

Frontend:
- React
- TypeScript
- Vite
- Ant Design
- React Router
- TanStack Query
- React Hook Form
- Zod

Backend:
- Node.js
- Express
- TypeScript
- Zod
- Prisma
- PostgreSQL

Environment:
- Docker Compose
- npm workspaces

Tests:
- Vitest
- Supertest

## Architecture

Use:

Presentation -> Service -> Repository -> Prisma -> PostgreSQL

Rules:

- Controllers must not call Prisma directly.
- React must not calculate business amounts.
- Repositories must not decide business rules.
- Services validate role, branch, state and business rules.
- Multi-table operations must use transactions.
- Do not create generic status-update endpoints.

## Fixed project rules

- The web is internal; customers do not log in.
- SALE, ACCOUNTANT and MANAGER belong to one branch.
- ADMIN sees the whole system.
- ADMIN does not manage roles, login accounts or passwords.
- SALE never confirms money.
- ACCOUNTANT records payments but does not final-approve deposits.
- MANAGER final-confirms deposit payment.
- Deposit payment expires 24 hours after ACCOUNTANT issues the request.
- Whole-room rental includes every bed in the room.
- One bed cannot have multiple active allocations.
- Exact six months uses the 50% refund rate.
- Beds become AVAILABLE only after checkout is fully completed.
- No file upload, real payment integration, real email/SMS or PDF generation.

## Do not change without approval

Do not silently change:

- docs;
- UI numbering;
- API endpoints or request fields;
- roles and permissions;
- state enums;
- ERD or Prisma models;
- Docker services or ports;
- shared types;
- business formulas.

If something is missing, ambiguous or contradictory:

1. Stop implementing the affected part.
2. State exactly what is unclear.
3. Cite the conflicting files or sections.
4. Suggest possible resolutions.
5. Ask the user which option to use.
6. Continue only unrelated work.

## Required workflow

Before editing:

1. Inspect the current repository.
2. State what is already implemented.
3. State what is missing.
4. List files to create or modify.
5. List API, database and test changes.
6. Report blockers or document conflicts.

After editing:

1. Run formatting or lint checks.
2. Run TypeScript typecheck.
3. Run unit tests.
4. Run integration tests relevant to the task.
5. Run build checks for affected applications.
6. Report exact commands and results.

Do not claim a test passed unless it was executed successfully.

If a test fails and cannot be fixed, report:

- exact failed command;
- exact error;
- likely cause;
- unfinished work;
- files affected.

## Scope restriction

Implement only the requested task.

Do not create sequence diagrams, three-layer class diagrams, report content or unrelated modules.