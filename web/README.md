# Sổ Tài Chính Gia Đình

Ứng dụng web quản lý tài chính gia đình, chạy bằng Node.js trên máy chủ và tên miền của riêng bạn.

- **Không cần cài thư viện nào.** Chỉ cần Node.js 22.13 trở lên (khuyên dùng Node 24). Cơ sở dữ liệu là SQLite có sẵn trong Node.
- **Đăng nhập theo từng người**, với 3 vai trò: Chủ sổ, Thành viên, Chỉ xem.
- **Đồng bộ tức thì:** một người ghi chép, màn hình của người khác tự cập nhật.
- **Tự sao lưu mỗi ngày** (giữ 14 bản), xuất CSV/JSON và khôi phục ngay trên giao diện.
- **Bảo mật:** mật khẩu băm bằng scrypt, cookie HttpOnly, chặn yêu cầu giả mạo từ trang khác (CSRF), CSP chặt, giới hạn số lần đăng nhập sai.

## 1. Chạy thử trên máy tính

```bash
cd web
npm start
```

Mở http://localhost:3000. Lần đầu, trang sẽ yêu cầu tạo **tài khoản chủ sổ**.

Đưa dữ liệu 2026 (đã chuyển từ bản cũ) vào:

```bash
npm run import -- data/du-lieu-2026.json
```

Cũng có thể đăng nhập, vào **Thiết lập › Khôi phục từ bản sao lưu** và chọn tệp `data/du-lieu-2026.json`.

## 1b. Dùng trên iPhone trong mạng Wi-Fi nhà (link ngắn, không qua dịch vụ ngoài)

1. Trên máy tính: bấm đúp **`Mo So Tai Chinh.cmd`** (thư mục FINANCE). Cửa sổ đen hiện link; giữ cửa sổ mở (có thể thu nhỏ).
2. Trên iPhone (cùng Wi-Fi nhà): mở Safari, gõ **`taichinh.local`** → đăng nhập.
3. Bấm nút Chia sẻ → **Thêm vào MH chính** → Thêm. Biểu tượng “Tài Chính” mở ứng dụng toàn màn hình.

- Tên `taichinh.local` do chính máy chủ phát trong mạng nhà (mDNS, giống cách iPhone tìm máy in). Đổi tên bằng `MDNS_NAME` trong `web/.env`.
- Nếu tên không mở được, dùng địa chỉ IP in trong cửa sổ máy chủ, ví dụ `http://192.168.1.14`.
- Máy tính phải bật và không ở chế độ ngủ thì điện thoại mới vào được.
- Ra ngoài (4G) sẽ không vào được: xem mục 2 để đưa lên tên miền riêng.

## 2. Đưa lên tên miền riêng

Bạn cần hai thứ:

1. **Một tên miền**, ví dụ `taichinh.giadinh.vn`. Mua ở nhà đăng ký như Mắt Bão, PA Vietnam, Tenten, Namecheap hoặc Cloudflare.
2. **Một nơi chạy máy chủ có ổ đĩa lưu trữ lâu dài**, vì SQLite cần ổ đĩa. Các dịch vụ chỉ chạy hàm "serverless" như Vercel hay Netlify **không** dùng được.

### Cách A — VPS + Docker (khuyên dùng, khoảng 100–150 nghìn đồng/tháng)

Có thể thuê VPS ở Vultr, DigitalOcean, Hetzner, hoặc nhà cung cấp trong nước như Viettel IDC, BizFly Cloud. Gói 1 vCPU, 1 GB RAM là đủ.

1. Tại trang quản lý tên miền, tạo **bản ghi A**: `taichinh` → địa chỉ IP của VPS.
2. Trên VPS (đã cài Docker), chép thư mục `web/` lên rồi chạy:

   ```bash
   cp .env.example .env
   nano .env          # sửa DOMAIN=taichinh.giadinh.vn
   docker compose up -d --build
   ```

3. Mở `https://taichinh.giadinh.vn`. Caddy tự cấp và gia hạn chứng chỉ HTTPS miễn phí.
4. Tạo tài khoản chủ sổ, rồi vào **Thiết lập › Khôi phục** và tải lên `du-lieu-2026.json`.

Cập nhật phiên bản mới: chép đè mã nguồn rồi chạy `docker compose up -d --build`. Dữ liệu nằm trong volume `finance-data`, không bị mất khi cập nhật.

### Cách B — Railway hoặc Render (không cần quản trị máy chủ)

1. Đưa thư mục `web/` lên một kho GitHub **riêng tư**.
2. Tạo dịch vụ mới từ kho đó. Nền tảng sẽ tự nhận `Dockerfile`.
3. **Gắn ổ đĩa (Volume / Persistent Disk) vào đường dẫn `/data`.** Nếu bỏ qua bước này, dữ liệu sẽ mất sau mỗi lần khởi động lại.
4. Đặt biến môi trường: `PUBLIC_URL=https://taichinh.giadinh.vn`, `TRUST_PROXY=1`.
5. Ở mục Custom Domain, thêm tên miền. Nền tảng sẽ đưa một **bản ghi CNAME** để bạn tạo ở nhà đăng ký tên miền.

### Cách C — Máy tính trong nhà + Cloudflare Tunnel (miễn phí)

Nếu có một máy luôn bật (mini PC, NAS), chạy `npm start` trên máy đó và dùng `cloudflared tunnel` để trỏ tên miền (quản lý DNS bằng Cloudflare) về `http://localhost:3000`. Đặt `PUBLIC_URL` và `TRUST_PROXY=1` trong `.env`.

## 3. Thêm người nhà

Vào **Thiết lập › Thành viên gia đình › Thêm thành viên**, nhập tên, tên đăng nhập, mật khẩu tạm và vai trò:

| Vai trò | Quyền |
|---|---|
| Chủ sổ | Toàn quyền, quản lý thành viên, khôi phục dữ liệu |
| Thành viên | Ghi chép và sửa dữ liệu |
| Chỉ xem | Xem, không sửa được |

Mỗi người tự đổi mật khẩu trong **Thiết lập › Đổi mật khẩu của bạn**. Trên điện thoại, chọn "Thêm vào Màn hình chính" để mở như một ứng dụng.

## 4. Sao lưu và khôi phục

- Máy chủ tự sao lưu mỗi ngày vào `DATA_DIR/backups/finance-YYYY-MM-DD.db` và giữ 14 bản.
- Sao lưu thủ công: `npm run backup`. Với Docker: `docker compose exec app npm run backup`.
- Nên tải bản **Sao lưu (.json)** ở mục Thiết lập về máy định kỳ, để có một bản nằm ngoài máy chủ.
- Quên mật khẩu chủ sổ (chạy trên máy chủ): `npm run reset-password -- <tên-đăng-nhập> <mật-khẩu-mới>`.

## 5. Cấu trúc mã nguồn

```
server.js            Khởi động máy chủ, tắt an toàn
src/config.js        Đọc biến môi trường
src/store.js         SQLite: bản ghi, sao lưu, nhập/xuất
src/auth.js          Tài khoản, mật khẩu (scrypt), phiên đăng nhập
src/app.js           HTTP API, đồng bộ tức thì (SSE), tệp tĩnh, header bảo mật
public/              Giao diện: index.html, login.html, css/, js/
scripts/             import, backup, reset-password
test/api.test.js     Kiểm thử API (npm test)
```

## API

Mọi API (trừ đăng nhập) đều yêu cầu cookie phiên đăng nhập.

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/session` | Người đang đăng nhập (hoặc `needsSetup`) |
| POST | `/api/setup` · `/api/login` · `/api/logout` | Thiết lập lần đầu, đăng nhập, đăng xuất |
| GET/POST | `/api/members` | Danh sách / thêm thành viên (chủ sổ) |
| PATCH/DELETE | `/api/members/:id` | Đổi tên, vai trò, mật khẩu / xóa |
| GET/POST | `/api/c/:collection` | Đọc / thêm bản ghi (`tx`, `fund`, `deposits`, `vcbf`, `months`, `config`) |
| GET/PUT/PATCH/DELETE | `/api/d/:collection/:id` | Đọc / ghi đè / gộp / xóa một bản ghi |
| GET | `/api/stream` | Sự kiện thay đổi (Server-Sent Events) |
| GET | `/api/export` · POST `/api/import` | Sao lưu JSON / khôi phục (chủ sổ) |
| GET | `/healthz` | Kiểm tra máy chủ còn chạy |
