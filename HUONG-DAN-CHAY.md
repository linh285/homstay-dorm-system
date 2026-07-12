# Hướng dẫn chạy HomeStay Dorm

Tài liệu này hướng dẫn chạy hệ thống nhanh nhất. Chi tiết nghiệp vụ và cấu hình
nâng cao xem trong [README.md](README.md).

## 1. Chuẩn bị

- Cài **Docker Desktop** và mở sẵn (chờ Docker Engine báo *running*).
- Cần Node.js 24+ và npm nếu muốn chạy local không dùng Docker (mục 4).

## 2. Chạy bằng Docker (khuyến nghị)

Mở terminal tại thư mục gốc dự án rồi chạy lần lượt:

```bash
# 1. Build và khởi động 3 service: db, api, web
docker compose up -d --build

# 2. Kiểm tra trạng thái (chờ cả 3 service đều "healthy")
docker compose ps
```

Sau khi container `db` đã `healthy`, chạy migration và tạo dữ liệu demo:

```bash
# 3. Áp dụng migration cho database
docker compose exec api npx prisma migrate deploy --config apps/api/prisma.config.ts

# 4. Tạo dữ liệu demo (profile mặc định = demo)
docker compose exec api npm run prisma:seed --workspace @homestay/api
```

Xong. Mở trình duyệt:

| Thành phần   | Địa chỉ                                      |
| ------------ | -------------------------------------------- |
| Web          | <http://localhost:5173>                      |
| API          | <http://localhost:3000/api/v1>               |
| Health check | <http://localhost:3000/api/v1/health>        |
| PostgreSQL   | `localhost:5432` — db `homestay_dorm`, user `homestay` |

## 3. Đăng nhập demo

Mật khẩu chung: `Password123!`

| Role       | Username       | Chi nhánh     |
| ---------- | -------------- | ------------- |
| SALE       | `sale01`       | CN001         |
| ACCOUNTANT | `accountant01` | CN001         |
| MANAGER    | `manager01`    | CN001         |
| ADMIN      | `admin01`      | Toàn hệ thống |

## 4. Nạp lại dữ liệu demo (tùy chọn)

Reset và tạo bộ dữ liệu lớn cho trình diễn, sau đó kiểm tra:

```bash
docker compose exec -e ALLOW_DEMO_RESET=true -e SEED_PROFILE=large api npm run prisma:seed --workspace @homestay/api
docker compose exec -e SEED_PROFILE=large api npm run prisma:seed:verify --workspace @homestay/api
```

Các profile: `small` (tối thiểu), `demo` (mặc định), `large` (trình diễn đầy đủ).
Chỉ khi có `ALLOW_DEMO_RESET=true` thì seed mới xóa dữ liệu cũ trước khi tạo lại.

## 5. Chạy local không dùng Docker

Cần PostgreSQL chạy sẵn tại `localhost:5432` khớp thông tin trong `.env.example`
(hoặc tự export `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, `JWT_SECRET`).

```bash
npm install
npx prisma migrate deploy --config apps/api/prisma.config.ts
npm run prisma:seed --workspace @homestay/api
npm run dev
```

Web ở cổng 5173, API ở cổng 3000. Vite tự proxy `/api` sang API local.

## 6. Lệnh thường dùng

```bash
# Xem log từng service
docker compose logs -f api
docker compose logs -f web
docker compose logs -f db

# Khởi động lại API sau khi sửa code (Docker)
docker compose restart api

# Dừng toàn bộ
docker compose down

# Dừng và xóa luôn dữ liệu database
docker compose down -v
```

## 7. Xử lý lỗi thường gặp

- **Docker chưa chạy:** mở Docker Desktop, chờ *running* rồi chạy lại
  `docker compose up -d --build`.
- **Port bị chiếm (5173 / 3000 / 5432):** dừng tiến trình đang dùng cổng, hoặc
  đổi cổng trong `compose.yaml`.
- **`db` chưa healthy:** chạy `docker compose ps`, xem `docker compose logs -f db`;
  chỉ chạy migration/seed khi `db` đã `healthy`.
- **Migration / seed lỗi:** xác nhận database đang chạy, chạy migration trước rồi
  mới seed; kiểm tra schema bằng
  `docker compose exec api npm run prisma:validate --workspace @homestay/api`.
- **`P1001: Can't reach database server at `db:5432``:** container `api` bị mất kết
  nối mạng nội bộ tới `db` (thường sau khi Docker khởi động lại). Dựng lại stack là
  hết — dữ liệu vẫn còn vì nằm trong volume:

  ```bash
  docker compose down
  docker compose up -d
  ```

  Nếu vẫn lỗi, kiểm tra tên `db` phân giải đúng IP nội bộ (dạng `172.x`), không phải
  IP public: `docker compose exec api getent hosts db`.
