# HomeStay Dorm

HomeStay Dorm là web nội bộ hỗ trợ quản lý quy trình thuê chỗ ở: tiếp nhận yêu
cầu thuê, quản lý thông tin khách và thành viên dự kiến, cùng dashboard và báo
cáo cơ bản theo role. Khách hàng không đăng nhập vào hệ thống.

## Phần đã có

- Đăng nhập bằng cookie HTTP-only cho `SALE`, `ACCOUNTANT`, `MANAGER`, `ADMIN`.
- Phân quyền theo role và giới hạn dữ liệu theo chi nhánh.
- Sale quản lý yêu cầu thuê, khách đại diện và thành viên dự kiến.
- Dashboard cơ bản theo role.
- Admin xem nhân viên, xem/cập nhật thông tin cơ bản của chi nhánh.
- Manager xem báo cáo chi nhánh; Admin xem báo cáo toàn hệ thống.

Chưa có code cho quản lý phòng/giường, tìm phòng, lịch xem, đặt cọc, nhận
phòng, bàn giao, trả phòng, đối soát và các báo cáo chi tiết khác.

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
demo. Không dùng các tài khoản/mật khẩu này cho production.

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
