<p align="center">
  <img src="./assets/logo.png" width="120" alt="Catholic Pilgrimage Logo">
</p>

<h1 align="center">⛪ Catholic Pilgrimage System Backend API (Hành hương Công giáo)</h1>

<p align="center">
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-blue.svg?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js Version"></a>
  <a href="https://expressjs.com"><img src="https://img.shields.io/badge/Express-4.18.2-000000.svg?style=for-the-badge&logo=express&logoColor=white" alt="Express Framework"></a>
  <a href="https://sequelize.org"><img src="https://img.shields.io/badge/Sequelize-6.35.0-52B0E7.svg?style=for-the-badge&logo=sequelize&logoColor=white" alt="Sequelize ORM"></a>
  <a href="https://www.postgresql.org"><img src="https://img.shields.io/badge/PostgreSQL-15-4169E1.svg?style=for-the-badge&logo=postgresql&logoColor=white" alt="Database"></a>
  <a href="https://www.docker.com"><img src="https://img.shields.io/badge/Docker-Enabled-2496ED.svg?style=for-the-badge&logo=docker&logoColor=white" alt="Docker Support"></a>
</p>

---

### Navigation / Điều hướng nhanh
* [🇬🇧 English Documentation](#english-version)
* [🇻🇳 Tài liệu Tiếng Việt](#tiếng-việt-version)

---

## English Version

### 📖 Introduction & Overview
This is the backend API service for the **Catholic Pilgrimage System** (SEP490 Graduation Thesis - DATN, FPT University). The platform connects Catholic pilgrims, local guides, and pilgrimage site managers to orchestrate safe, engaging, and spiritually enriching journeys across sanctuary shrines and historic parishes in Vietnam.

### 🛡️ Role-Based Access Control (RBAC)
The system supports 4 distinct user roles:
1. **Pilgrim (User)**: Explore sites, co-plan trips, write journals, share posts, pay deposits, check-in using GPS/QR, and request SOS support.
2. **Local Guide**: Assigned to specific pilgrimage sites to handle guide schedules, post updates/events, view review summaries, and resolve nearby SOS emergencies.
3. **Site Manager**: Administer site details (mass times, events, media validation, review replies) and manage local guides.
4. **Platform Admin**: System configuration, verification request approvals (for managers/guides), platform-wide financial audit, and report resolution.

---

### 🚀 Key Core Features

#### 1. Smart Trip Planner & Co-planning Chat
* **Itinerary Building**: Seamlessly structure days, pilgrimage sites, activities, and routes.
* **Co-Planning (Multiplayer)**: Invite friends to co-plan the trip. Real-time updates and synchronization are handled via **Socket.io**.
* **Live Chat**: Group chat integrated inside the planner for members to align on logistics.

#### 2. Escrow Commitment System & Anti-Fraud Settlements
To guarantee member commitment during group pilgrimages, the system enforces a deposit system:
* **Escrow Lock**: When joining a trip, members deposit a commitment fee using **PayOS**. This balance is locked in their wallet (`locked_balance`).
* **Check-In Verification**: During the trip, pilgrims must check in at scheduled pilgrimage sites. The check-in validation requires GPS coordinates proximity verification (using **Haversine formula**) or QR code scans.
* **Daily Settlement**: Upon trip completion or cancellation, an automated **node-cron** settlement runs:
  * **Present Pilgrims**: Members with valid check-ins get a 100% refund of their deposit.
  * **No-Shows**: Members who fail to check in are penalized ($n\%$ of deposit goes to the planner host; remainder is refunded).
  * **Suspicious/Ghost Trips**: If *no one* (including the owner) checks in, the system marks the trip suspicious, fully refunds all deposits, and voids all penalties.

#### 3. Advanced Integrations

```mermaid
flowchart TD
    A[Pilgrim App] <-->|APIs / WebSockets| B(Express Backend API)
    B <-->|ORM / SQL| C[(Supabase / Postgres)]
    B -->|Gemini API| D[Google AI Service]
    B -->|Receive & Payout| E[PayOS Gateway]
    B -->|TTS Narration| F[VBee API]
    B -->|Routing & Geocoding| G[Vietmap API]
    B -->|Push Notifications| H[Expo / Firebase]
    B -->|Storage| I[Cloudinary]
</div>
```

* **Google Gemini AI**:
  * *Route Suggestions*: Recommends optimized paths based on user preferences.
  * *Prayer Generation*: Recommends specific prayers for a diary entry based on the writer's emotions.
  * *Article Writing*: Assists guides in drafting event articles.
  * *Review Summary*: Synthesizes user feedback to help guides improve services.
* **PayOS Gateway**: Integrated for both **Receive** (topup/deposit locks) and **Payout** (withdrawing wallet funds directly).
* **Vietmap API**: Used for reverse-geocoding coordinates and calculating precise itinerary routes/geometry in Vietnam.
* **VBee TTS**: Converts text descriptions of holy sites into smooth Vietnamese audio narrations, creating audio guide tours.
* **SOS Emergency System**: Real-time location broadcast. Guides assigned to the site are instantly notified via push alerts to coordinate quick rescue operations.

---

### 📂 Directory Structure

* [app.js](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-BACKEND/app.js): Entry point of the Express application.
* [config/](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-BACKEND/config): Third-party config (Firebase, PayOS, Cloudinary, VBee, Gemini, Database).
* [controllers/](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-BACKEND/controllers): Request handlers mapped to business logic.
* [database/](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-BACKEND/database): Raw SQL schema ([full_schema.sql](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-BACKEND/database/full_schema.sql)).
* [locales/](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-BACKEND/locales): Translation dictionaries (`en.json` and `vi.json`).
* [middlewares/](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-BACKEND/middlewares): Authentication, role authorization, validation, internationalization, and error handling.
* [models/](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-BACKEND/models): Sequelize schema definitions (35 models, structured in [index.js](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-BACKEND/models/index.js)).
* [routes/](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-BACKEND/routes): API endpoint routing definition.
* [services/](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-BACKEND/services): Core business logic implementations.
* [tests/](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-BACKEND/tests): Comprehensive test suites (auth, verification, planners, SOS, etc.).
* [utils/](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-BACKEND/utils): Cron jobs, Haversine logic, routing utils, and response formatting helper files.
* [validators/](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-BACKEND/validators): API request payloads validation schemas.

---

### ⚙️ Getting Started & Deployment

#### Prerequisites
* Node.js v18 or higher
* PostgreSQL v15 database

#### 1. Setup Environment Configuration
Copy the template [.env.example](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-BACKEND/.env.example) to `.env` and fill in the required credentials:
```bash
cp .env.example .env
```

#### 2. Local Setup
```bash
# Install dependencies
npm install

# Run the development server (with nodemon)
npm run dev

# Run test suites
npm test
```

#### 3. Docker Deployment
Deploy the database and backend application seamlessly using Docker Compose:
```bash
# Start all containers in the background
docker-compose up -d

# Check service logs
docker-compose logs -f app
```

---

## Tiếng Việt Version

### 📖 Giới thiệu Dự án
Đây là dịch vụ Backend API cho hệ thống **Hành hương Công giáo** (Đồ án Tốt nghiệp SEP490 - DATN, Đại học FPT). Nền tảng kết nối giáo dân, hướng dẫn viên địa phương và người quản lý địa điểm hành hương nhằm tổ chức các chuyến đi an toàn, gắn kết tinh thần và giàu trải nghiệm tâm linh tại các thánh địa, giáo xứ lịch sử Việt Nam.

### 🛡️ Phân quyền Người dùng (RBAC)
Hệ thống hỗ trợ 4 vai trò cụ thể:
1. **Pilgrim (Giáo dân/Khách hành hương)**: Tìm kiếm địa điểm, cùng lên kế hoạch hành trình, viết nhật ký, chia sẻ bài viết, ký quỹ cam kết, điểm danh (GPS/QR) và gửi yêu cầu cứu hộ SOS.
2. **Local Guide (Hướng dẫn viên địa phương)**: Được chỉ định tại địa điểm hành hương để trực ca, đăng tải thông báo/sự kiện, xem tóm tắt đánh giá và giải quyết các tình huống khẩn cấp SOS gần đó.
3. **Site Manager (Quản lý địa điểm)**: Quản lý thông tin chi tiết địa điểm (giờ lễ, sự kiện, duyệt ảnh/video, trả lời đánh giá) và điều phối các hướng dẫn viên địa phương.
4. **Platform Admin (Quản trị viên nền tảng)**: Quản trị hệ thống, phê duyệt hồ sơ đăng ký quản lý địa điểm/hướng dẫn viên, kiểm toán tài chính và giải quyết báo cáo xấu (reports).

---

### 🚀 Tính năng Cốt lõi & Đột phá

#### 1. Lên kế hoạch thông minh & Co-planning Chat
* **Thiết lập hành trình**: Lên kế hoạch chi tiết theo ngày, chọn điểm hành hương, thời gian sinh hoạt và định tuyến đường đi.
* **Đồng hành trình (Multiplayer)**: Mời bạn bè cùng lên kế hoạch chuyến đi. Cập nhật và đồng bộ hóa thời gian thực qua **Socket.io**.
* **Chat nhóm**: Kênh trò chuyện riêng biệt tích hợp ngay trong mỗi hành trình giúp các thành viên trao đổi tiện lợi.

#### 2. Hệ thống Ký quỹ Cam kết & Sát hạch Chống gian lận
Để nâng cao trách nhiệm khi tham gia hành trình nhóm, hệ thống áp dụng cơ chế ký quỹ thông minh:
* **Khóa ký quỹ**: Khi tham gia nhóm, thành viên phải nộp một khoản tiền cọc thông qua cổng **PayOS**. Tiền này sẽ được khóa tạm thời trong ví (`locked_balance`).
* **Sát hạch điểm danh**: Trong hành trình, giáo dân cần tiến hành điểm danh tại các điểm đến quy định. Việc điểm danh yêu cầu khớp tọa độ GPS (sử dụng **Công thức Haversine**) hoặc quét mã QR.
* **Quy trình quyết toán tự động**: Khi chuyến đi kết thúc hoặc bị hủy bỏ, hệ thống tự động quét quyết toán qua **node-cron**:
  * **Tham gia đầy đủ**: Thành viên có điểm danh hợp lệ được hoàn trả 100% tiền cọc về ví khả dụng.
  * **Vắng mặt (No-Show)**: Thành viên không điểm danh sẽ bị phạt $n\%$ số tiền cọc (số tiền phạt chuyển cho trưởng đoàn; phần còn lại hoàn về thành viên).
  * **Hành trình ảo (Ghost Trips)**: Nếu *không một ai* (bao gồm cả trưởng đoàn) điểm danh, chuyến đi bị coi là hành trình ảo. Hệ thống hủy phạt và hoàn cọc 100% cho mọi người để tránh việc trưởng đoàn gian lận tiền phạt.

#### 3. Các Tích hợp Công nghệ Cao
* **Google Gemini AI**:
  * *Gợi ý lộ trình*: Đề xuất tuyến đường tối ưu dựa trên sở thích hành hương của giáo dân.
  * *Gợi ý lời nguyện*: Đọc nội dung/cảm xúc nhật ký hành trình để gợi ý các bài kinh/lời nguyện Công giáo phù hợp.
  * *Soạn thảo bài viết*: Hỗ trợ hướng dẫn viên viết nhanh các mô tả sự kiện.
  * *Tóm tắt đánh giá*: Tổng hợp nhanh phản hồi của giáo dân về địa điểm để gửi cho hướng dẫn viên.
* **PayOS Gateway**: Tích hợp thanh toán trực tuyến cho cả hai chiều: **Nạp tiền ký quỹ (Receive)** và **Rút tiền từ ví (Payout)**.
* **Vietmap API**: Tính toán hình học lộ trình hành hương chi tiết và định vị ngược (reverse-geocoding) tối ưu trên bản đồ Việt Nam.
* **VBee TTS**: Chuyển các văn bản giới thiệu, lịch sử địa điểm thánh thành giọng nói tiếng Việt tự nhiên, phục vụ tính năng Audio Guide (thuyết minh tự động).
* **Hệ thống SOS Khẩn cấp**: Định vị và phát tín hiệu khẩn cấp thời gian thực. Hướng dẫn viên trực tại điểm đến sẽ nhận thông báo đẩy tức thì qua **Expo/Firebase** để tiến hành cứu trợ nhanh chóng.

---

### ⚙️ Hướng dẫn Cài đặt & Vận hành

#### Yêu cầu Hệ thống
* Node.js v18 trở lên
* Cơ sở dữ liệu PostgreSQL v15

#### 1. Cấu hình Môi trường
Sao chép file cấu hình mẫu [.env.example](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-BACKEND/.env.example) thành `.env` và điền đầy đủ các khóa API:
```bash
cp .env.example .env
```

#### 2. Khởi chạy Cục bộ (Local)
```bash
# Cài đặt thư viện
npm install

# Chạy server ở chế độ Development (Nodemon)
npm run dev

# Chạy tất cả các bài kiểm tra tự động (Tests)
npm test
```

#### 3. Triển khai bằng Docker
Triển khai nhanh cơ sở dữ liệu và ứng dụng thông qua Docker Compose:
```bash
# Khởi chạy các container ở chế độ background
docker-compose up -d

# Xem log hoạt động của backend app
docker-compose logs -f app
```

---
*Developed with ❤️ by Catholic Pilgrimage DATN Team @ FPT University.*
