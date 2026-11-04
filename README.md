# Hệ Thống Quản Lý Và Xử Lý Vi Phạm Giao Thông

Ứng dụng web hỗ trợ lực lượng cảnh sát giao thông **phát hiện, xác minh và xử phạt vi phạm** dựa trên camera giám sát kết hợp **AI nhận diện biển số xe (YOLO)**, đồng thời cho phép **công dân tra cứu vi phạm, hóa đơn và xác nhận thông tin phương tiện** của mình.

> Đồ án tốt nghiệp — Nguyễn Sỹ Huy Hoàng

---

## Mục Lục

- [Chức Năng](#chức-năng)
- [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
- [Công Nghệ Sử Dụng](#công-nghệ-sử-dụng)
- [Cấu Trúc Dự Án](#cấu-trúc-dự-án)
- [Cơ Sở Dữ Liệu](#cơ-sở-dữ-liệu)
- [API Endpoints](#api-endpoints)
- [Hướng Dẫn Cài Đặt](#hướng-dẫn-cài-đặt)
- [Biến Môi Trường](#biến-môi-trường)
- [Tài Khoản Mẫu](#tài-khoản-mẫu)
- [Phân Quyền](#phân-quyền)
- [Tài Liệu Thiết Kế](#tài-liệu-thiết-kế)
- [Ghi Chú Phát Triển](#ghi-chú-phát-triển)

---

## Chức Năng

### Chung (mọi người dùng)
- Đăng nhập bằng **email, số CCCD hoặc số điện thoại**; đăng xuất
- Bắt buộc **đổi mật khẩu ở lần đăng nhập đầu tiên** (tài khoản công dân do cán bộ cấp)
- Đổi mật khẩu; ghi nhận **lịch sử đăng nhập** (thành công / thất bại, IP, trình duyệt)

### Cán bộ công an (`OFFICER`, `ADMIN`)
| Màn hình | Chức năng |
|----------|-----------|
| Tổng quan | Thống kê vi phạm theo ngày, theo loại, theo điểm camera; vi phạm mới nhất |
| Quét biển số | Tải ảnh lên để AI nhận diện biển số, hoặc tra cứu thủ công → xem phương tiện, chủ xe, vi phạm và biên lai liên quan |
| Công dân | Xem / tìm kiếm, thêm mới (tự gửi tài khoản qua email), cập nhật thông tin, xem lịch sử đăng nhập |
| Phương tiện | Xem / tìm kiếm, đăng ký mới, cập nhật, **cập nhật biển số qua ảnh tải lên**, chuyển nhượng quyền sở hữu |
| Vi phạm | Danh sách có bộ lọc, xem chi tiết, thêm vi phạm thủ công kèm ảnh bằng chứng, xác minh, từ chối, chỉnh sửa biển số |
| Hàng đợi AI | Duyệt các vi phạm do AI phát hiện (`AI_PENDING`): xác minh, xác minh và phát hành hóa đơn, hoặc từ chối |
| Hóa đơn | Danh sách biên lai, phát hành hóa đơn từ vi phạm đã xác minh, hủy biên lai (kèm lý do) |
| Camera | Danh sách camera, trạng thái hoạt động, xem khung hình / video mẫu, cập nhật hoặc gỡ video |
| Báo cáo | Thống kê theo kỳ (diễn biến vi phạm và thu phạt, cơ cấu loại vi phạm, địa điểm nhiều vi phạm), xuất CSV |

### Công dân (`CITIZEN`)
| Màn hình | Chức năng |
|----------|-----------|
| Trang chủ | Tổng quan phương tiện, vi phạm và hóa đơn của bản thân |
| Hồ sơ cá nhân | Xem thông tin cá nhân, đổi mật khẩu |
| Phương tiện | Xem phương tiện đứng tên; **xác nhận**, **yêu cầu chỉnh sửa** hoặc **từ chối** thông tin do cán bộ đăng ký |
| Vi phạm | Tra cứu vi phạm, lọc theo xe / loại / trạng thái / thời gian, xem chi tiết và hóa đơn liên quan |
| Hóa đơn | Danh sách hóa đơn theo trạng thái (chưa nộp, quá hạn, đã nộp), xem chi tiết |

> **Đang phát triển:** *Quên mật khẩu* và *Khiếu nại vi phạm* đã có giao diện nhưng backend chưa có API tương ứng.

---

## Kiến Trúc Hệ Thống

```
┌──────────────────┐   /api (proxy)   ┌──────────────────┐   HTTP    ┌──────────────────┐
│     Frontend     │ ───────────────▶ │     Backend      │ ────────▶ │    AI Service    │
│ React + Vite     │                  │ Node.js/Express  │           │ FastAPI + YOLO   │
│ Port 5173        │                  │ Port 5000        │           │ Port 8000        │
└──────────────────┘                  └───┬──────────┬───┘           └──────────────────┘
                                          │          │
                               ┌──────────▼───┐  ┌───▼─────────────────────┐
                               │  MySQL 8.0   │  │ Dịch vụ ngoài           │
                               │  Port 3309   │  │ • Cloudinary (lưu ảnh)  │
                               └──────────────┘  │ • Gmail SMTP (gửi mail) │
                                                 └─────────────────────────┘
```

**Luồng xử lý vi phạm**

1. Camera / cán bộ cung cấp ảnh → Backend gửi sang AI Service
2. AI Service dùng YOLO phát hiện vùng biển số, sau đó đọc từng ký tự → trả về biển số và độ tin cậy
3. Vi phạm do AI ghi nhận ở trạng thái `AI_PENDING` và nằm trong **hàng đợi AI**; cán bộ cũng có thể lập vi phạm thủ công (`source = OFFICER`)
4. Cán bộ kiểm tra, sửa biển số nếu cần → **xác minh** (`OFFICER_VERIFIED`) hoặc **từ chối** (`REJECTED`)
5. Phát hành hóa đơn → vi phạm chuyển sang `INVOICED`, hóa đơn ở trạng thái `UNPAID`
6. Công dân đăng nhập để tra cứu vi phạm và hóa đơn của mình

---

## Công Nghệ Sử Dụng

### Frontend
| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| React + TypeScript | 18.3 / 5.2 | Xây dựng giao diện |
| Vite | 5.2 | Build tool, dev server, proxy `/api` |
| TanStack Router | 1.31 | Định tuyến theo file (`src/routes`) |
| Tailwind CSS | 3.4 | Giao diện |
| Recharts | 2.15 | Biểu đồ tổng quan, báo cáo |
| Zustand | 4.5 | Quản lý state |
| Lucide React, Sonner | — | Icon, thông báo toast |

### Backend
| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| Node.js | 18 (Docker) / 20 LTS | Runtime |
| Express | 5.2 | REST API |
| Knex.js + mysql2 | 3.3 / 3.24 | Query builder, migration, seed |
| jsonwebtoken, bcryptjs | 9.0 / 3.0 | Xác thực JWT, băm mật khẩu |
| axios, form-data | 1.20 / 4.0 | Gọi AI Service |
| cloudinary | 2.11 | Lưu ảnh biển số, ảnh bằng chứng |
| nodemailer | 6.10 | Gửi email tài khoản cho công dân |
| sharp | 0.33 | Xử lý ảnh |

### AI Service
| Công nghệ | Mục đích |
|-----------|----------|
| Python 3.10+, FastAPI, Uvicorn | Web service |
| Ultralytics YOLO | `detect_plate.pt` — phát hiện vùng biển số; `read_characters.pt` — nhận dạng ký tự |
| OpenCV, NumPy | Đọc và cắt ảnh |

### Cơ sở dữ liệu & triển khai
MySQL 8.0, Docker Compose.

---

## Cấu Trúc Dự Án

```
DoAnTotNghiep/
├── docker-compose.yml               # MySQL + Backend (AI Service tùy chọn)
├── docs/                            # Tài liệu thiết kế (ERD, use case)
│
├── frontend/                        # React + TypeScript SPA
│   └── src/
│       ├── components/              # AppShell (layout), ui, ChangePasswordModal, PlateImageUpload
│       ├── lib/                     # api.ts, auth.tsx, types.ts, format.ts, cn.ts
│       └── routes/
│           ├── index.tsx            # Đăng nhập
│           ├── forgot_password.tsx  # Quên mật khẩu
│           ├── citizen/             # dashboard, profile, vehicles/, violations/, invoices/
│           └── officer/             # dashboard, scan, citizens, vehicles, violations/,
│                                    # violation_queues, invoices, cameras, reports
│
├── backend/                         # Node.js + Express REST API
│   ├── knexfile.js
│   ├── .env.example
│   └── src/
│       ├── server.js                # Entry point
│       ├── routes/                  # authRoutes, citizenRoutes, officerRoutes
│       ├── controllers/             # auth, citizen, officer, violation
│       ├── middlewares/             # authMiddleware (JWT), roleMiddleware (phân quyền)
│       ├── services/                # plateRecognition (gọi AI), imageStorage (Cloudinary)
│       ├── utils/                   # mappers, trustSystemCa
│       └── db/
│           ├── migrations/          # Tạo bảng + các migration bổ sung
│           └── seeds/               # Dữ liệu mẫu
│
└── ai-service/                      # Python FastAPI
    ├── main.py                      # /health, /api/ai/detect-plate
    ├── plate_utils.py               # Ghép ký tự thành chuỗi biển số
    └── models/                      # detect_plate.pt, read_characters.pt (không commit)
```

---

## Cơ Sở Dữ Liệu

MySQL 8.0, toàn bộ schema quản lý bằng **Knex migrations**. Sơ đồ quan hệ: [`docs/LuocDoQuanHe.png`](docs/LuocDoQuanHe.png).

| Bảng | Nội dung chính |
|------|----------------|
| `users` | Tài khoản (`CITIZEN` / `OFFICER` / `ADMIN`), CCCD, email, SĐT, giới tính, địa chỉ, `must_change_password` |
| `vehicles` | Phương tiện, biển số, chủ sở hữu, số khung / máy / bảo hiểm, ảnh biển số, `verification_status` (`PENDING` / `APPROVED` / `REJECTED` / `REVISION_REQUESTED`) |
| `vehicle_verification_history` | Lịch sử công dân xác nhận / phản hồi thông tin phương tiện |
| `fines` | Mức phạt theo loại vi phạm (`RED_LIGHT`, `WRONG_LANE`, `SPEEDING`, `ILLEGAL_PARKING`, `HELMET_LESS`, `WRONG_WAY`) |
| `cameras` | Camera giám sát: mã, vị trí, tọa độ, trạng thái, URL luồng / video mẫu |
| `camera_events` | Sự kiện thô AI ghi nhận từ camera (biển số, độ tin cậy, bounding box) |
| `violations` | Vi phạm: nguồn (`AI` / `OFFICER`), biển số AI đọc và biển số đã hiệu chỉnh, ảnh bằng chứng, trạng thái `AI_PENDING` → `OFFICER_VERIFIED` / `REJECTED` → `INVOICED` |
| `invoices` | Hóa đơn phạt: mã, số tiền, hạn nộp, trạng thái `UNPAID` / `PAID` / `OVERDUE` / `CANCELLED` |
| `notifications` | Thông báo gửi người dùng (`EMAIL` / `SMS` / `APP_PUSH`) |
| `login_history` | Lịch sử đăng nhập: kết quả, lý do thất bại, IP, user agent |
| `audit_logs` | Nhật ký thao tác phục vụ truy vết |

---

## API Endpoints

Các endpoint cần xác thực gửi kèm header `Authorization: Bearer <JWT_TOKEN>`.

### Xác thực — `/api/auth`
| Method | Endpoint | Auth | Mô tả |
|--------|----------|:----:|-------|
| POST | `/login` | — | Đăng nhập (`username` là email, CCCD hoặc SĐT) |
| POST | `/logout` | JWT | Đăng xuất |
| GET | `/me` | JWT | Thông tin người dùng hiện tại |
| PATCH | `/change-password` | JWT | Đổi mật khẩu |

### Công dân — `/api/citizen` (role `CITIZEN`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/dashboard` | Phương tiện, vi phạm, hóa đơn của công dân |
| POST | `/vehicles/:id/approve` | Xác nhận thông tin phương tiện |
| POST | `/vehicles/:id/request-revision` | Yêu cầu cán bộ chỉnh sửa thông tin |
| POST | `/vehicles/:id/reject` | Từ chối thông tin phương tiện |

### Cán bộ — `/api/officer` (role `OFFICER` hoặc `ADMIN`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/dashboard` | Thống kê toàn hệ thống |
| GET | `/plates?plate=` | Tra cứu theo biển số |
| POST | `/scan-plate` | Nhận diện biển số từ ảnh (qua AI Service) |
| POST | `/plate-images` | Tải ảnh biển số / bằng chứng lên Cloudinary |
| PATCH | `/cameras/:id/video` | Cập nhật / gỡ video mẫu của camera |
| GET · POST | `/citizens` | Danh sách / thêm công dân |
| PATCH | `/citizens/:id` | Cập nhật công dân |
| GET | `/citizens/:id/login-history` | Lịch sử đăng nhập của công dân |
| GET · POST | `/vehicles` | Danh sách / đăng ký phương tiện |
| PATCH | `/vehicles/:id` | Cập nhật phương tiện |
| POST | `/vehicles/:id/transfer` | Chuyển nhượng quyền sở hữu |
| GET | `/violations/queue` | Hàng đợi vi phạm do AI phát hiện |
| GET · POST | `/violations` | Danh sách (có lọc) / thêm vi phạm thủ công |
| GET | `/violations/:id` | Chi tiết vi phạm |
| POST | `/violations/:id/verify` | Xác minh vi phạm |
| POST | `/violations/:id/reject` | Từ chối vi phạm |
| PATCH | `/violations/:id/plate` | Chỉnh sửa biển số |
| POST | `/violations/:id/invoice` | Phát hành hóa đơn |
| POST | `/invoices/:id/cancel` | Hủy biên lai |

### AI Service — `http://localhost:8000`
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/health` | Kiểm tra trạng thái |
| POST | `/api/ai/detect-plate` | Nhận diện biển số (`multipart/form-data`, field `file`) |

```json
{
  "success": true,
  "detections": [
    {
      "bbox": { "x1": 120, "y1": 80, "x2": 320, "y2": 140 },
      "plate_detection_confidence": 0.9342,
      "plate_text": "51G-123.45",
      "ocr_confidence": 0.8761
    }
  ]
}
```

---

## Hướng Dẫn Cài Đặt

### Yêu cầu
- Docker Desktop 4.x+
- Node.js 20 LTS
- Python 3.10+
- File model YOLO: `detect_plate.pt`, `read_characters.pt`

### 1. Cấu hình môi trường

```bash
cp backend/.env.example backend/.env
```

Điền thông tin Cloudinary, email và `JWT_SECRET` (xem [Biến Môi Trường](#biến-môi-trường)).

### 2. Khởi động MySQL và Backend

```bash
docker compose up -d --build
```

- `DoAnTotNghiep-DB` — MySQL 8.0, cổng `3309`
- `DoAnTotNghiep-Backend` — API, cổng `5000`

### 3. Tạo bảng và dữ liệu mẫu

```bash
docker exec DoAnTotNghiep-Backend npm run db:migrate
docker exec DoAnTotNghiep-Backend npm run db:seed
```

### 4. Chạy AI Service

```bash
cd ai-service
python -m venv venv
venv\Scripts\activate            # Windows  (Linux/macOS: source venv/bin/activate)
pip install fastapi uvicorn ultralytics opencv-python numpy python-multipart
# Đặt models/detect_plate.pt và models/read_characters.pt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

> Chỉ cần cài các thư viện trên; `requirements.txt` hiện là bản `pip freeze` của môi trường cá nhân, chứa nhiều gói không liên quan.

### 5. Chạy Frontend

```bash
cd frontend
npm install
npm run dev
```

Mở `http://localhost:5173`. Vite tự proxy `/api` sang `http://localhost:5000`.

### Chạy Backend không dùng Docker (debug)

```bash
docker compose up -d mysql-db
cd backend
npm install
npm run db:migrate && npm run db:seed
npm run dev                      # http://localhost:5000 (theo PORT trong .env)
```

---

## Biến Môi Trường

`backend/.env` (mẫu ở `backend/.env.example`). Khi chạy bằng Docker, `docker-compose.yml` ghi đè các biến `PORT`, `DB_*`, `AI_SERVICE_URL`.

| Biến | Mô tả |
|------|-------|
| `NODE_ENV`, `PORT` | Môi trường, cổng API (mặc định `5000`) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Kết nối MySQL (local: `127.0.0.1:3309`, `root/root`, `DoAnTotNghiep`) |
| `JWT_SECRET` | Khóa ký JWT — **đổi khi triển khai thật** |
| `AI_SERVICE_URL` | Địa chỉ AI Service (local: `http://localhost:8000`) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER` | Lưu trữ ảnh |
| `EMAIL_USER`, `EMAIL_PASS` | Gmail và App Password để gửi tài khoản cho công dân |

Frontend (tùy chọn): `VITE_API_URL` — URL tuyệt đối của backend khi không dùng proxy của Vite.

> ⚠️ Không commit file `.env`.

---

## Tài Khoản Mẫu

Sau khi chạy seed, mật khẩu mặc định của mọi tài khoản là **`123456`**.

| Vai trò | Email | Ghi chú |
|---------|-------|---------|
| Quản trị viên | `admin@traffic.gov.vn` | |
| Cán bộ công an | `officer@traffic.gov.vn` | |
| Công dân | `citizen@gmail.com`, `lemai@gmail.com`, `hungpham@gmail.com` | Phải đổi mật khẩu ở lần đăng nhập đầu |

Công dân do cán bộ tạo mới cũng có mật khẩu mặc định `123456` và nhận thông tin tài khoản qua email.

---

## Phân Quyền

| Chức năng | CITIZEN | OFFICER | ADMIN |
|-----------|:-------:|:-------:|:-----:|
| Đăng nhập, đổi mật khẩu | ✅ | ✅ | ✅ |
| Xem phương tiện, vi phạm, hóa đơn của bản thân | ✅ | — | — |
| Xác nhận / phản hồi thông tin phương tiện | ✅ | — | — |
| Quét, tra cứu biển số | ❌ | ✅ | ✅ |
| Quản lý công dân, phương tiện | ❌ | ✅ | ✅ |
| Quản lý vi phạm, duyệt hàng đợi AI | ❌ | ✅ | ✅ |
| Phát hành, hủy hóa đơn | ❌ | ✅ | ✅ |
| Giám sát camera, xem báo cáo | ❌ | ✅ | ✅ |

> Hiện `ADMIN` dùng chung quyền với `OFFICER` (`requireRoles('OFFICER', 'ADMIN')`), chưa có chức năng riêng cho quản trị viên.

---

## Tài Liệu Thiết Kế

| Tài liệu | Đường dẫn |
|----------|-----------|
| Lược đồ quan hệ CSDL | [`docs/LuocDoQuanHe.png`](docs/LuocDoQuanHe.png) |
| Use case tổng quát | [`docs/usecase/UseCaseTongQuat.png`](docs/usecase/UseCaseTongQuat.png) |
| Use case phân rã (10 chức năng) | [`docs/usecase/phan_ra/`](docs/usecase/phan_ra/) |

Sơ đồ use case được sinh từ script Python (matplotlib), chỉnh sửa rồi chạy lại:

```bash
python docs/usecase/ve_usecase_tong_quat.py docs/usecase/UseCaseTongQuat.png
python docs/usecase/ve_usecase_phan_ra.py
```

---

## Ghi Chú Phát Triển

- **Lệnh database** (trong `backend/`): `npm run db:migrate`, `npm run db:seed`, `npm run db:rollback` (rollback toàn bộ), `npm run db:reset` (rollback → migrate → seed)
- **Migration:** bảng gốc đặt tiền tố `001_` … `009_`; thay đổi bổ sung đặt tiền tố ngày `YYYYMMDD_` để đảm bảo thứ tự chạy
- **Cổng MySQL** expose ra `3309` để tránh trùng MySQL cài sẵn (`3306`)
- **Model AI** (`.pt`) không commit do dung lượng lớn — đặt thủ công vào `ai-service/models/`
- **TanStack Router:** `src/routeTree.gen.ts` được sinh tự động khi chạy `npm run dev` / `npm run build`
- **AI Service trong Docker:** đã có `ai-service/Dockerfile` và khối cấu hình (đang comment) trong `docker-compose.yml`; khi bật, đổi `AI_SERVICE_URL` của backend thành `http://ai-service:8000`
