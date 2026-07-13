# Final Release Verification

## Phạm vi và baseline

- Baseline được xác nhận trước khi hardening: `main` = `origin/main` =
  `047595f1b1a6ca935298d23d4823a53faeaf394c`.
- Verification được thực hiện trên nhánh `fix/final-release-hardening`; không sửa
  trực tiếp `main`.
- Môi trường: Docker Compose development, PostgreSQL 16, ngày 13-07-2026
  (Asia/Ho_Chi_Minh).

## Kết quả quality gate

| Kiểm tra | Kết quả |
|---|---|
| `npm ci` | PASS |
| `npm run prisma:validate --workspace @homestay/api` | PASS |
| `npm run format:check` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test` | PASS — API: 52 test; Web: 9 test |
| `npm run test:e2e` — lượt 1 | PASS — 1 API workflow + 5 Playwright tests |
| `npm run test:e2e` — lượt 2 | PASS — 1 API workflow + 5 Playwright tests |
| `npm run build` | PASS |
| `docker compose config` | PASS |
| `docker compose ps` | PASS — `api`, `web`, `db` đều healthy |
| `GET /api/v1/health` và `GET http://localhost:5173/` | PASS — HTTP 200 |

Lưu ý môi trường: Node hiển thị cảnh báo deprecation của `pg`, JSDOM báo chưa hỗ
trợ pseudo-element khi test, và Vite cảnh báo bundle JavaScript 1.43 MB. Không có
test nào thất bại vì các cảnh báo này.

## Seed và dữ liệu demo

Đã chạy `migrate deploy`, sau đó reset có guard với `ALLOW_DEMO_RESET=true` và
`SEED_PROFILE=large`, rồi chạy `prisma:seed:verify`. Kết quả cuối:

| Nhóm | Số bản ghi |
|---|---:|
| Chi nhánh / nhân viên / tài khoản | 4 / 26 / 26 |
| Phòng / giường | 60 / 240 |
| Khách / yêu cầu thuê / thành viên | 300 / 180 / 415 |
| Lịch xem / chi tiết | 100 / 199 |
| Đặt cọc / chi tiết / phân bổ giường | 70 / 154 / 121 |
| Thanh toán / chi tiết | 114 / 95 |
| Hợp đồng / giường hợp đồng / dịch vụ hợp đồng | 40 / 88 / 120 |
| Bàn giao / tài sản bàn giao | 25 / 75 |
| Yêu cầu trả / kiểm tra / chi tiết kiểm tra | 30 / 20 / 40 |
| Đối soát / khấu trừ | 20 / 33 |

Mười lăm scenario `DEMO-*` đều tồn tại. Mapping branch/tài khoản đã được đối
chiếu lại với seed large trong `docs/demo-scenarios.md` và
`docs/11-seed-scenarios.md`.

## Luồng nghiệp vụ, E2E và phân quyền

| Phạm vi | Bằng chứng | Kết quả |
|---|---|---|
| Yêu cầu thuê, matching, viewing, đặt cọc | API workflow E2E và Playwright Sale | PASS |
| Check-in, hợp đồng, bàn giao | API workflow E2E | PASS |
| Checkout, đối soát, hoàn/thu thêm | API workflow E2E và Playwright Accountant | PASS |
| SALE | Dashboard, matching, logout và giới hạn report | PASS |
| ACCOUNTANT | Deposit/checkout, bị chặn report | PASS |
| MANAGER | Report vận hành được phép | PASS |
| ADMIN | Report toàn hệ thống được phép | PASS |

Browser smoke thủ công trong in-app browser xác nhận Dashboard và logout của SALE,
không có console error. Bốn role được kiểm tra lại qua Playwright trên Docker
runtime ở cả hai lượt E2E; không có request 401 lặp hoặc lỗi console trong test.

## Invariant PostgreSQL đã kiểm tra trực tiếp

Tất cả truy vấn sau trả `0` vi phạm sau seed large và verify:

- một giường có nhiều allocation `ACTIVE`;
- RequestMember trỏ tới Customer không phải `INDIVIDUAL`;
- số thành viên vượt `expectedResidents`;
- SALE của Rental Request khác chi nhánh;
- số tiền thanh toán âm;
- payment đã xác nhận/đợi Manager nhưng `paidAt > expiresAt`;
- deposit bị reject/cancel/expired còn allocation HELD active;
- hợp đồng `ACTIVE` thiếu allocation OCCUPIED active;
- checkout `COMPLETED` chưa thanh lý hợp đồng hoặc còn allocation active;
- thiếu một trong 15 bản ghi scenario demo.

Seed verify cũng kiểm tra unique khách hàng, whole-room đủ giường trong một phòng,
allocation cùng chi nhánh, tổng khấu trừ và số dư đối soát. E2E/integration test
kiểm tra matching không tạo allocation, payment chỉ tính `CONFIRMED` cho báo cáo và
các side effect transaction của workflow.

## Hardening đã thực hiện

- Sửa seed contract/checkout để checkout `COMPLETED` chỉ dùng hợp đồng
  `LIQUIDATED`; thêm invariant tương ứng vào `seed/verify.ts`.
- Chuẩn hóa format các file được merge nhưng chưa đạt Prettier.
- Đồng bộ tài khoản demo theo đúng branch của bản ghi seed.
- Bổ sung `npm run test:e2e` vào README.
- Bổ sung inventory 93 path/method vào OpenAPI.

## Kiểm tra secret và file rác

- Chỉ có `.env.example` được track; không có `.env` thật, private key, token GitHub
  hoặc secret theo các pattern đã quét.
- Không có `node_modules`, `dist`, coverage, Playwright report, log hoặc file tạm
  được track.
- `npm audit --omit=dev --audit-level=high` không fail, nhưng báo 3 vulnerability
  mức moderate qua dependency Prisma development (`@hono/node-server`). Không chạy
  `npm audit fix --force` vì sẽ hạ Prisma theo hướng breaking change.

## Giới hạn còn lại và verdict

- Không có blocker hoặc lỗi mức high còn mở.
- OpenAPI đã liệt kê đầy đủ route/method hiện có (93 path), nhưng chi tiết request/
  response schema cho các module ngoài Rental Request chưa đầy đủ: đây là giới hạn
  tài liệu mức medium, không phải thay đổi API đã được kiểm thử.
- Cảnh báo `pg`, JSDOM, Vite bundle lớn và 3 moderate dependency vulnerabilities là
  các follow-up mức low/medium.

**READY FOR DEMO: YES**

**READY FOR SUBMISSION: YES, với các follow-up tài liệu và dependency nêu trên.**

Core business workflow có thể được tuyên bố hoàn thành theo scope hiện tại, nhưng
không tuyên bố độ hoàn chỉnh 100% vì OpenAPI chi tiết ngoài Rental Request vẫn cần
được bổ sung.
