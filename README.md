# HomeStay Dorm

HomeStay Dorm là web nội bộ hỗ trợ quản lý quy trình thuê chỗ ở: tiếp nhận yêu
cầu thuê, quản lý thông tin khách và thành viên dự kiến, cùng dashboard và báo
cáo cơ bản theo role. Khách hàng không đăng nhập vào hệ thống.

## Phần đã có

- Đăng nhập bằng cookie HTTP-only cho `SALE`, `ACCOUNTANT`, `MANAGER`, `ADMIN`.
- Phân quyền theo role và giới hạn dữ liệu theo chi nhánh.
- Sale quản lý yêu cầu thuê, khách đại diện và thành viên dự kiến.
- Sale tìm phòng phù hợp từ UI-06 mà không giữ giường; kết quả tôn trọng chi
  nhánh, khả dụng, giới tính, điều hòa/chỗ gửi xe và xếp hạng mức yên tĩnh.
- Quản lý phòng, giường, dịch vụ và tài sản phòng (UI-04); trạng thái kinh doanh
  của giường tính từ phân bổ giường.
- Lịch xem phòng và ghi nhận kết quả xem (UI-07).
- Quy trình đặt cọc bảy bước với phân bổ giường, hạn 24 giờ và job tự động hết
  hạn (UI-08).
- Nhận phòng, duyệt điều kiện cư trú, hợp đồng giấy, thanh toán ban đầu và bàn
  giao phòng/tài sản (UI-09, UI-10).
- Trả phòng, kiểm tra hiện trạng, đối soát, hoàn cọc/thu thêm và hoàn tất trả
  phòng (UI-11, UI-12, UI-13).
- Dashboard cơ bản theo role.
- Admin xem nhân viên, xem/cập nhật thông tin cơ bản của chi nhánh.
- Manager xem báo cáo chi nhánh; Admin xem báo cáo toàn hệ thống.

Các công thức nghiệp vụ (tiền cọc, tỷ lệ hoàn, số dư cuối) đều tính ở backend;
mọi chuyển trạng thái đều qua endpoint nghiệp vụ riêng theo đúng máy trạng thái.

## Công nghệ

- Frontend: React, TypeScript, Vite, Ant Design, TanStack Query.
- Backend: Node.js, Express, TypeScript, Zod, Prisma.
- Database: PostgreSQL 16.
- Môi trường: Docker Compose, npm workspaces.
- Kiểm thử: Vitest và Supertest.

## Yêu cầu cài đặt

- Docker Desktop đang chạy.
- Node.js 24 trở lên.
- npm.

## Chạy nhanh bằng Docker

```bash
git clone https://github.com/linh285/homstay-dorm-system.git
cd homstay-dorm-system
docker compose up -d --build
docker compose ps
```

Compose đã có cấu hình development mặc định. `.env.example` là tài liệu tham
chiếu cho biến môi trường; không cần tạo `.env` để chạy Docker mặc định.

Sau lần chạy đầu, áp dụng migration và tạo dữ liệu demo:

```bash
docker compose exec api npx prisma migrate deploy --config apps/api/prisma.config.ts
docker compose exec api npm run prisma:seed --workspace @homestay/api
```

Seed mặc định dùng `SEED_PROFILE=demo`. Để reset dữ liệu demo và tạo bộ dữ liệu
lớn cho trình diễn:

```bash
docker compose exec -e ALLOW_DEMO_RESET=true -e SEED_PROFILE=large api npm run prisma:seed --workspace @homestay/api
docker compose exec -e SEED_PROFILE=large api npm run prisma:seed:verify --workspace @homestay/api
```

Các địa chỉ mặc định:

- Web: <http://localhost:5173>
- API: <http://localhost:3000/api/v1>
- Health check: <http://localhost:3000/api/v1/health>
- PostgreSQL: `localhost:5432`, database `homestay_dorm`, user `homestay`.

## Migration và seed

Khi PostgreSQL đang chạy trên máy chủ, có thể chạy từ thư mục gốc:

```bash
npx prisma migrate deploy --config apps/api/prisma.config.ts
npm run prisma:seed --workspace @homestay/api
```

Seed có thể chạy lặp lại an toàn và dùng `SEED_PASSWORD` nếu cần thay mật khẩu
demo. Seed không chạy reset khi `NODE_ENV=production`; thao tác xóa dữ liệu demo
chỉ thực hiện khi đặt `ALLOW_DEMO_RESET=true`. Không dùng các tài khoản/mật khẩu
này cho production.

Các profile seed:

- `small`: dữ liệu tối thiểu để kiểm tra nhanh.
- `demo`: dữ liệu mặc định cho phát triển hằng ngày.
- `large`: dữ liệu lớn, đa dạng để trình diễn toàn hệ thống.

Profile mặc định là `demo` khi không đặt `SEED_PROFILE`.

Lệnh Docker cho từng profile:

```bash
docker compose exec -e ALLOW_DEMO_RESET=true -e SEED_PROFILE=small api npm run prisma:seed --workspace @homestay/api
docker compose exec -e ALLOW_DEMO_RESET=true -e SEED_PROFILE=demo api npm run prisma:seed --workspace @homestay/api
docker compose exec -e ALLOW_DEMO_RESET=true -e SEED_PROFILE=large api npm run prisma:seed --workspace @homestay/api
```

Có thể chạy lại các lệnh seed trên nhiều lần để reset và tạo lại đúng bộ dữ liệu
demo theo profile. Nếu không đặt `ALLOW_DEMO_RESET=true`, seed chỉ upsert/thêm dữ
liệu theo khóa cố định và không chủ động xóa dữ liệu hiện có.

Lệnh verify seed trong Docker:

```bash
docker compose exec -e SEED_PROFILE=large api npm run prisma:seed:verify --workspace @homestay/api
```

15 mã `DEMO-*` là các hồ sơ cố định để demo nhanh theo từng màn hình. Chi tiết
được mô tả tại [docs/demo-scenarios.md](docs/demo-scenarios.md):

- `DEMO-RR-NEW`: yêu cầu thuê mới trong ngày.
- `DEMO-RR-WHOLE-ROOM`: nhu cầu thuê nguyên phòng.
- `DEMO-RR-SHARED-BEDS`: nhu cầu thuê ghép nhiều giường.
- `DEMO-VIEWING-TODAY`: lịch xem hôm nay đã xác nhận.
- `DEMO-DEPOSIT-WAITING`: phiếu cọc đang chờ thanh toán.
- `DEMO-DEPOSIT-EXPIRING`: phiếu cọc sắp hết hạn 24 giờ.
- `DEMO-PAYMENT-RECHECK`: payment cần Accountant kiểm tra lại.
- `DEMO-DEPOSIT-APPROVAL`: Manager có thể xác nhận tiền cọc.
- `DEMO-CHECKIN`: khách đã đến, đang chờ cập nhật cư trú.
- `DEMO-HANDOVER`: hồ sơ sẵn sàng bàn giao.
- `DEMO-CHECKOUT-NO-CONTRACT`: trả phòng khi chỉ có cọc, hoàn 80%.
- `DEMO-SETTLEMENT-6-MONTHS`: ở đúng 6 tháng, hoàn 50%.
- `DEMO-SETTLEMENT-REFUND`: đối soát có tiền cần hoàn.
- `DEMO-SETTLEMENT-EXTRA`: đối soát có tiền cần thu thêm.
- `DEMO-SETTLEMENT-ZERO`: đối soát số dư bằng 0.

## Tài khoản demo (chỉ development)

Mật khẩu mặc định: `Password123!`

| Role       | Username       | Chi nhánh     |
| ---------- | -------------- | ------------- |
| SALE       | `sale01`       | CN001         |
| ACCOUNTANT | `accountant01` | CN001         |
| MANAGER    | `manager01`    | CN001         |
| ADMIN      | `admin01`      | Toàn hệ thống |

## Cách sử dụng các màn hình hiện có

1. Mở Web và đăng nhập bằng một tài khoản demo.
2. Sale dùng **Yêu cầu thuê** để tạo, xem, sửa/đóng hồ sơ và quản lý thành viên.
3. Admin dùng **Nhân viên và chi nhánh** để xem nhân viên, xem chi tiết và cập
   nhật thông tin cơ bản chi nhánh.
4. Manager và Admin dùng **Báo cáo**; Manager chỉ thấy chi nhánh của mình.
5. Dashboard hiển thị các counter phù hợp với role đang đăng nhập.

## Chạy local không dùng Docker

Cần có PostgreSQL đang chạy tại `localhost:5432` với thông tin mặc định trong
`.env.example`, hoặc export các biến `DATABASE_URL`, `PORT`, `CORS_ORIGIN`,
`JWT_SECRET` trước khi chạy.

```bash
npm install
npx prisma migrate deploy --config apps/api/prisma.config.ts
npm run prisma:seed --workspace @homestay/api
npm run dev
```

Web chạy ở cổng 5173 và API ở cổng 3000. Vite proxy `/api` đến API local.

## Lệnh hữu ích

```bash
# Kiểm tra định dạng
npm run format:check

# Định dạng toàn repository
npm exec prettier -- --write .

# Lint, typecheck, test và build
npm run lint
npm run typecheck
npm run test
npm run build

# Kiểm tra Prisma
npm run prisma:validate --workspace @homestay/api

# Kiểm tra dữ liệu seed demo
npm run prisma:seed:verify --workspace @homestay/api

# Xem log Docker
docker compose logs -f api
docker compose logs -f web
docker compose logs -f db

# Dừng Docker
docker compose down
```

## Cấu trúc thư mục

```text
apps/
  api/       Express, Prisma, repository/service/controller/route
  web/       React/Vite
docs/        Đặc tả nghiệp vụ, ERD, API và test cases
openapi/     Hợp đồng OpenAPI
compose.yaml Docker Compose cho db, api, web
```

## Xử lý lỗi thường gặp

- **Docker chưa chạy:** mở Docker Desktop, chờ Docker Engine sẵn sàng rồi chạy
  lại `docker compose up -d --build`.
- **Port bị chiếm:** kiểm tra cổng 5173, 3000 hoặc 5432; dừng tiến trình đang
  dùng cổng, hoặc thay đổi cổng trong `compose.yaml` nếu được phê duyệt.
- **Database chưa healthy:** chạy `docker compose ps`, sau đó xem
  `docker compose logs -f db`; chỉ chạy migration/seed khi `db` là `healthy`.
- **Migration hoặc seed lỗi:** xác nhận database đang chạy, chạy lại migration
  trước seed, và xem log API/DB. Có thể kiểm tra schema bằng
  `npm run prisma:validate --workspace @homestay/api`.
