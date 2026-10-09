# Sổ Tài Chính Nhà Mình

Công cụ quản lý tài chính gia đình: thu chi hằng tháng, quỹ khẩn cấp, sổ tiết kiệm, danh mục đầu tư cho con và tài sản ròng qua nhiều năm. Giao diện có 3 ngôn ngữ (Tiếng Việt, English, 日本語) và chế độ sáng/tối.

- `web/` — ứng dụng Node.js tự chạy (không cần thư viện ngoài). Xem [web/README.md](web/README.md).
- `app/` — bản đầu tiên dạng trang đơn (Claude Artifact).
- `Mo So Tai Chinh.cmd` — chạy ứng dụng trên Windows; điện thoại trong Wi-Fi nhà mở `http://taichinh.local`.

Dữ liệu tài chính nằm trong `web/data/` trên máy chạy ứng dụng và **không** được lưu trong kho Git này.
