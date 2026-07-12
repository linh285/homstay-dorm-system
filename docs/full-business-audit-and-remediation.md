# A. Executive Summary

- Baseline audited: `6f14712bc5b5fd9ce328a09e6b3c90ac283bd968` on `main`.
- Remediation branch: `fix/full-business-workflow`.
- Before remediation: room matching API/UI was missing; `openapi/openapi.yaml`,
  `docs/09-error-codes.md`, and `docs/11-seed-scenarios.md` were empty; the
  format gate reported 94 files; Ant Design emitted a deprecation warning.
- After remediation: UI-06 room matching, matching API, regression coverage,
  error-code and seed-scenario documentation, OpenAPI baseline, and formatting
  are implemented. No migration or business enum was changed.
- Demo readiness: **PASS for automated API/DB E2E and core UI smoke**. Seed
  large and verification pass; the workflow is exercised from a new request to
  completed checkout with `E2E-*` fixtures. Full manual UI operation of every
  form remains partial.

| Status | Count | Notes |
| --- | ---: | --- |
| PASS | 8 | Matching, DB allocation invariant, role/branch checks, seed, quality gates. |
| FIXED | 4 | `AUDIT-001` to `AUDIT-004`. |
| PARTIAL | 2 | Full OpenAPI payload coverage and manual operation of every UI form. |
| UNVERIFIED | 1 | Browser regression for all 14 UI screens on this final build. |

# B. Requirement Traceability Matrix

| ID | Yêu cầu | UI/API/DB | Trước | Sau | Test | Bằng chứng |
| --- | --- | --- | --- | --- | --- | --- |
| RR-MATCH | Tìm phòng không giữ giường | UI-06/API/DB | MISSING | PASS | API integration + smoke | `searchRooms`, count allocation không đổi |
| RR-MEMBER | Đủ thành viên trước tìm phòng | API | MISSING | PASS | API integration | `MEMBER_COUNT_INCOMPLETE` 422 |
| RR-GENDER | Chính sách giới tính cứng | API | MISSING | PASS | API integration | MALE/FEMALE/ANY/null coverage |
| RR-QUIET | Xếp hạng yên tĩnh, không loại | API/UI | MISSING | PASS | API integration + UI smoke | HIGH, MEDIUM, LOW theo score |
| DB-ALLOC | Một giường chỉ một allocation active | DB | PASS | PASS | repository/invariant tests | partial unique index `uq_active_bed_allocation` |
| DOC-ERROR | Danh mục lỗi thực tế | Docs | MISSING | PASS | source audit | `docs/09-error-codes.md` |
| DOC-SEED | Profile/scenario thực tế | Docs | MISSING | PASS | seed verify | `docs/11-seed-scenarios.md` |
| AUTH | Cookie/JWT logout idempotent | API/UI | PASS | PASS | auth integration + previous smoke | login/me/logout flows |

# C. 14 UI

| UI | Role | Chức năng | Test/audit | Trạng thái |
| --- | --- | --- | --- | --- |
| UI-01 | All staff | Login/logout | Auth integration; browser logout/login | PASS |
| UI-02 | All staff | Dashboard theo role | unit/API smoke | PASS |
| UI-03 | Admin | Nhân viên, chi nhánh | API/source audit | PASS |
| UI-04 | Sale/Manager/Admin | Phòng và giường | room integration | PASS |
| UI-05 | Sale | Danh sách yêu cầu thuê | web/API tests | PASS |
| UI-06 | Sale | Hồ sơ và phòng phù hợp | browser + API integration | PASS |
| UI-07 | Sale | Lịch xem phòng | viewing integration | PASS |
| UI-08 | Sale/Accountant/Manager | Đặt cọc | deposit integration | PASS |
| UI-09 | Sale/Accountant/Manager | Nhận phòng | contract integration | PASS |
| UI-10 | Manager | Bàn giao | contract/handover source audit | PARTIAL browser |
| UI-11 | Sale/Manager | Trả phòng | checkout integration | PASS |
| UI-12 | Manager/Accountant | Kiểm tra/đối soát | checkout/settlement integration | PASS |
| UI-13 | Accountant/Manager | Hoàn tất tài chính/trả phòng | settlement integration | PASS |
| UI-14 | Manager/Admin | Báo cáo | reporting integration + prior API smoke | PASS |

# D. API

Routes follow `Route → Validator → Controller → Service → Repository → Prisma`;
controllers do not call Prisma directly. There is no generic status-update route.

| Nhóm | Role | Branch/state enforcement | Transaction | Status |
| --- | --- | --- | --- | --- |
| Auth (`login`, `logout`, `me`) | All | JWT cookie and active account | N/A | PASS |
| Rental Request + `search-rooms` | Sale | Sale branch; ACTIVE/VIEWING; member count | read-only search | PASS |
| Viewing | Sale | branch/request/viewing transitions | create/update | PASS |
| Deposit/payment | Sale/Accountant/Manager | state and branch; expiry/recheck/reject | multi-table | PASS |
| Contract/check-in/handover | Sale/Accountant/Manager | resident/payment/handover prerequisites | multi-table | PASS |
| Checkout/inspection/settlement | Sale/Accountant/Manager | role and liquidation prerequisites | multi-table | PASS |
| Rooms/catalog | Sale/Manager/Admin | branch and protected allocations | multi-table changes | PASS |
| Dashboard/reports/admin | scoped roles | Manager branch/Admin system | read-only | PASS |

# E. ERD/DB

| Model/constraint | Enforced by | Status |
| --- | --- | --- |
| Active bed allocation unique | PostgreSQL partial unique index | PASS |
| Branch isolation | Service/repository predicates | PASS |
| RequestMember is individual | validator/service | PASS |
| memberCount ≤ expectedResidents | service | PASS |
| memberCount = expectedResidents before matching/viewing | matching/viewing services | PASS |
| Currency arithmetic | Prisma Decimal in services | PASS |

The member-count and customer-type rules are service constraints rather than DB
CHECK constraints. This is intentional in the current ERD; concurrent writes
remain protected for active allocations by the database index.

# F. State Machine

| Entity | From → action → To | Side effect | Status |
| --- | --- | --- | --- |
| Rental request | ACTIVE → create viewing → VIEWING | no allocation | PASS |
| Viewing | SCHEDULED → CONFIRMED → VISITED → RESULT_RECORDED | deposit only after deposit result | PASS |
| Deposit | WAITING_PAYMENT → payment → WAITING_MANAGER_CONFIRMATION | HELD allocation | PASS |
| Deposit | payment rejection/expiry/cancel → final | HELD → ENDED atomically | PASS |
| Contract | CHECKIN_DRAFT → … → ACTIVE | handover makes allocations OCCUPIED | PASS |
| Checkout | DRAFT → … → COMPLETED | liquidate/END allocation only at completion | PASS |

# G. Phân quyền

| Chức năng | SALE | ACCOUNTANT | MANAGER | ADMIN | Kết quả |
| --- | --- | --- | --- | --- |
| Rental request/matching/viewing | Manage own branch | No | No | No | PASS |
| Deposit money record/final approval | No final approval | Record | Final approve | No | PASS |
| Rooms | Read | No | Manage own branch | Read | PASS |
| Reports | No | No | Own branch | System | PASS |
| Branch basic update | No | No | No | Yes | PASS |

# H. Quality Gates

| Lệnh | Kết quả | Chi tiết |
| --- | --- | --- |
| `npm run prisma:validate --workspace @homestay/api` | PASS | Prisma schema valid |
| `npm run format:check` | PASS | All matched files formatted |
| `npm run lint` | PASS | ESLint clean |
| `npm run typecheck` | PASS | API và web |
| `npm run test` | PASS | 52 API + 9 web = 61 tests |
| `npm run test:e2e` | PASS | 1 API/DB workflow + 5 Playwright browser scenarios |
| `npm run build` | PASS | API build + Vite build |
| `docker compose config` | PASS | Compose valid |
| migrate/seed/verify large | PASS | 3 migrations, 15 DEMO scenarios |

# I. Browser/API/E2E

- Browser: Sale login/logout, UI-05/UI-06 matching and whole-room display,
  Viewings, Accountant Deposits/Checkout plus report denial, Manager Check-in
  and Reports, and Admin Reports were verified in Chromium-based Edge. UI-06
  rendered a real result for `RR001`: score 2, available beds,
  matched/unmatched preferences, services and assets. No `BedAllocation` was
  added (121 before/after API smoke).
- API: health 200; login Sale 200; `POST /rental-requests/RR001/search-rooms`
  200; logout 200. Cross-branch `RR003` returned 403.
- E2E: `apps/api/src/e2e/business-workflow.e2e.test.ts` creates a fresh
  request and completes the full API/DB chain. Playwright verifies login/logout
  and UI-06 matching with a Chromium-based Edge executable.

# J. Findings

## AUDIT-001 — HIGH — Missing room matching workflow

- Expected: UI-06 and `POST /rental-requests/:id/search-rooms` exist.
- Before: docs specified them, code did not.
- Fixed: added route, controller, service, repository query, API client and UI
  tab. It is read-only and deterministically sorted.
- Regression: rental-request integration tests and browser/API smoke.
- Result: FIXED.

## AUDIT-002 — HIGH — Empty operational documentation

- Before: OpenAPI, error-code and seed-scenario files were empty.
- Fixed: OpenAPI baseline documents health/auth/rental including matching;
  `docs/09` reflects actual errors; `docs/11` reflects the real profiles and 15
  demo scenarios.
- Result: PARTIAL — remaining OpenAPI paths still need full request/response
  schemas for all non-rental modules.

## AUDIT-003 — BLOCKER — Formatting gate failed

- Before: Prettier reported 94 files with style issues.
- Fixed: formatted repository.
- Regression: `npm run format:check`.
- Result: FIXED.

## AUDIT-004 — MEDIUM — Deprecated Ant Design Space prop

- Before: browser emitted a `Space.direction` deprecation warning.
- Fixed: replaced all `direction="vertical"` uses with `orientation="vertical"`.
- Regression: source scan and final browser build retest; no console errors.
- Result: FIXED.

# K. Vấn đề còn lại

1. **MEDIUM:** OpenAPI currently establishes the shared envelope and fully
   documents health/auth/rental matching; the remaining module routes still
   rely on `docs/08-api-contract.md` for detailed payloads. Priority: P1.
2. **MEDIUM:** Seed scenario documentation currently assigns `RR002` and
   `D002` to the CN001 demo accounts, but the deterministic large-profile seed
   places them in CN002 and CN004 respectively. The records and access control
   are correct; the scenario actor mapping needs profile-aware documentation.
   Priority: P1 before using the 15 scenarios as a guided demo script.
3. **MEDIUM:** Full manual UI operation of every workflow form has not been
   executed in this audit. The API/DB chain and the core UI smoke are automated.
   Priority: P1 before release.
4. **LOW:** Test execution emits a `pg` v9 deprecation warning from the Prisma
   adapter query lifecycle and jsdom pseudo-element warnings. Tests pass, but
   dependency/test-environment maintenance is recommended.

# L. Remediation Scope

Modified source is limited to rental-room matching, shared display formatting,
and replacement of deprecated presentation props. No Prisma schema, migration,
role, state enum, formula, Docker port, or generic status endpoint was added.

# M. Final Review Checklist

Before commit: run `git diff --check`, `git status --short`, and `git diff --stat`.
Do not claim browser or E2E completion beyond the evidence in section I.

# N. End-to-End Verification

Test fixture uses branch `E2E-CN001`, rooms `E2E-ROOM-A`/`E2E-ROOM-B`, and beds
`E2E-BED-A1`, `E2E-BED-A2`, `E2E-BED-B1`, `E2E-BED-B2`. Runtime IDs for customer,
rental request, viewing, deposit, payment, contract, handover, checkout,
inspection, settlement and allocation are generated by the real services and
are asserted through their final PostgreSQL state; cleanup removes the fixture
after each run.

| Step | Role | Entity | Before | Action | After | DB side effect | UI/API | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Sale | Rental Request | none | create + 2 members | `ACTIVE` | no allocation | API E2E | PASS |
| 2 | Sale | Matching/Viewing | `ACTIVE` | search, create, confirm, visit, result | request `VIEWING` → `DEPOSIT_PROCESS`; viewing `RESULT_RECORDED` | allocation count unchanged during search | API E2E + Playwright | PASS |
| 3 | Sale/Manager/Accountant | Deposit/Payment | `DRAFT` | rules, room check, issue, record, approve | `DEPOSITED` | `HELD` → `DEPOSITED`; amount `4,000,000.00` | API E2E | PASS |
| 4 | Sale/Manager/Accountant | Contract/Handover | `CHECKIN_DRAFT` | arrival, residents, eligibility, paper, payment, handover | contract `ACTIVE`; handover `COMPLETED` | allocations `DEPOSITED` → `OCCUPIED` | API E2E | PASS |
| 5 | Sale/Manager/Accountant | Checkout/Settlement | none | submit, inspect, settle, refund, liquidate, complete | checkout `COMPLETED`; contract `LIQUIDATED` | allocations `ENDED`; bed becomes available | API E2E | PASS |
| 6 | Sale | Auth/UI | unauthenticated | login, dashboard, logout | `/login` after logout | cookie cleared | Playwright | PASS |
| 7 | Sale/Accountant/Manager/Admin | UI | demo records | role-specific list/detail/report smoke | Vietnamese labels and role guard | no unintended mutation | 5 Playwright scenarios | PASS |

Special branches remain covered by API integration tests: whole-room,
shared-bed allocation, expiry, recheck/rejection/cancel, resident rejection,
deposit-only checkout (80%), exactly six months (50%), over six months (70%),
contract expiry (100%), refund/additional/zero balance/dispute, and branch/role
forbidden cases. `npm run test` exercises these regression tests.

During browser verification, UI-05 exposed raw `SHARED_BEDS`, `ACTIVE` and
`VIEWING` labels. Root cause: `RentalRequestsPage` rendered fields directly.
The page now uses `formatStatusLabel`, with a Vitest regression assertion and a
Playwright assertion. Result: FIXED.
