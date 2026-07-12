# A. Executive Summary

- Baseline audited: `6f14712bc5b5fd9ce328a09e6b3c90ac283bd968` on `main`.
- Remediation branch: `fix/full-business-workflow`.
- Before remediation: room matching API/UI was missing; `openapi/openapi.yaml`,
  `docs/09-error-codes.md`, and `docs/11-seed-scenarios.md` were empty; the
  format gate reported 94 files; Ant Design emitted a deprecation warning.
- After remediation: UI-06 room matching, matching API, regression coverage,
  error-code and seed-scenario documentation, OpenAPI baseline, and formatting
  are implemented. No migration or business enum was changed.
- Demo readiness: **PARTIAL**. Seed large and verification pass; API/UI smoke
  covers authentication, dashboard and UI-06. A single manual, destructive,
  end-to-end run from a newly created request through completed checkout was not
  executed in this audit.

| Status | Count | Notes |
| --- | ---: | --- |
| PASS | 8 | Matching, DB allocation invariant, role/branch checks, seed, quality gates. |
| FIXED | 4 | `AUDIT-001` to `AUDIT-004`. |
| PARTIAL | 2 | Full OpenAPI payload coverage and manual full E2E. |
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
| `npm run build` | PASS | API build + Vite build |
| `docker compose config` | PASS | Compose valid |
| migrate/seed/verify large | PASS | 3 migrations, 15 DEMO scenarios |

# I. Browser/API/E2E

- Browser: Admin dashboard and logout, Sale dashboard, UI-06 tabs and search
  were observed. UI-06 rendered a real result for `RR001`: score 2, available
  beds, matched/unmatched preferences, services and assets. No `BedAllocation`
  was added (121 before/after API smoke).
- API: health 200; login Sale 200; `POST /rental-requests/RR001/search-rooms`
  200; logout 200. Cross-branch `RR003` returned 403.
- E2E: module integration tests cover each workflow segment. A fresh full
  request-to-checkout manual chain is **UNVERIFIED** and must be performed
  before a production-like release.

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
2. **MEDIUM:** Manual complete E2E from a newly created request to completed
   checkout has not been executed in this audit. Priority: P1 before release.
3. **LOW:** Test execution emits a `pg` v9 deprecation warning from the Prisma
   adapter query lifecycle and jsdom pseudo-element warnings. Tests pass, but
   dependency/test-environment maintenance is recommended.

# L. Remediation Scope

Modified source is limited to rental-room matching, shared display formatting,
and replacement of deprecated presentation props. No Prisma schema, migration,
role, state enum, formula, Docker port, or generic status endpoint was added.

# M. Final Review Checklist

Before commit: run `git diff --check`, `git status --short`, and `git diff --stat`.
Do not claim browser or E2E completion beyond the evidence in section I.
