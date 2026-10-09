#!/usr/bin/env bash
# Cài / cập nhật Sổ Tài Chính Nhà Mình trên VPS Ubuntu/Debian (chạy bằng quyền root).
#   bash setup-vps.sh daucherryhome.cloud
# Chạy lại lệnh này bất cứ lúc nào để cập nhật lên bản mới nhất trên GitHub; dữ liệu được giữ nguyên.
set -euo pipefail

DOMAIN="${1:-}"
REPO="https://github.com/thanhlongvn58/daucherryhome.git"
DIR="/opt/daucherryhome"

if [ -z "$DOMAIN" ]; then echo "Cách dùng: bash setup-vps.sh <tên-miền>   (ví dụ: daucherryhome.cloud)"; exit 1; fi
if [ "$(id -u)" -ne 0 ]; then echo "Hãy chạy bằng tài khoản root (hoặc thêm sudo)."; exit 1; fi

echo "==> 1/5 Kiểm tra Docker và Git"
if ! command -v git >/dev/null 2>&1; then apt-get update -y && apt-get install -y git; fi
if ! command -v docker >/dev/null 2>&1; then curl -fsSL https://get.docker.com | sh; fi
docker compose version >/dev/null

echo "==> 2/5 Tải mã nguồn"
if [ -d "$DIR/.git" ]; then git -C "$DIR" pull --ff-only; else git clone "$REPO" "$DIR"; fi
cd "$DIR/web"

echo "==> 3/5 Cấu hình tên miền $DOMAIN"
printf 'DOMAIN=%s\nBACKUP_KEEP=30\n' "$DOMAIN" > .env

echo "==> 4/5 Mở cổng 80/443 (nếu đang bật tường lửa UFW)"
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 22/tcp >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; ufw allow 443/udp >/dev/null
fi

echo "==> 5/5 Khởi động ứng dụng"
docker compose up -d --build

VPS_IP="$(curl -fsS -4 https://api.ipify.org || hostname -I | awk '{print $1}')"
DNS_IP="$(getent ahostsv4 "$DOMAIN" | awk '{print $1}' | sort -u | tr '\n' ' ')"
echo
echo "IP của VPS:          $VPS_IP"
echo "Tên miền đang trỏ về: ${DNS_IP:-chưa có}"
if echo " $DNS_IP " | grep -q " $VPS_IP "; then
  echo "DNS đã đúng. Mở https://$DOMAIN (lần đầu chờ 1–2 phút để cấp chứng chỉ HTTPS)."
else
  echo "DNS CHƯA trỏ về VPS. Vào hPanel › Tên miền › $DOMAIN › DNS:"
  echo "  - Xóa các bản ghi A của @ hiện có và bản ghi CNAME của www."
  echo "  - Thêm: A  @    $VPS_IP"
  echo "  - Thêm: A  www  $VPS_IP"
  echo "Sau khi DNS cập nhật, Caddy tự cấp HTTPS; không cần chạy lại lệnh này."
fi
echo
echo "Xem nhật ký: cd $DIR/web && docker compose logs -f --tail=50"
