# Hùng Vương Concert: GAMEON 🎮 (Astro Edition)

Dự án website chính thức của **Hùng Vương Concert: GAMEON** đã được tái cấu trúc và tối ưu hóa toàn diện bằng **Astro 5+**.

---

## ⚡ Các Tính Năng & Tối Ưu Nổi Bật

1. **Hiệu ứng Glitch Retro Pixel Arcade (Spider-Verse & 8-bit Tilemap):**
   - Giữ nguyên 100% logic tách lớp màu anaglyph, dịch chuyển mảng pixel bước (stepped plates), dither Bayer checkerboard, và hạt pixel star cross (`+`).
   - Tối ưu hiệu năng bằng `IntersectionObserver`: Chỉ kích hoạt hiệu ứng khi phần tử lọt vào tầm nhìn người dùng (viewport), kích hoạt hiệu ứng toàn phần khi nhìn thấy lần đầu và khi rê chuột (hover).
   - Tông màu thương hiệu chuẩn: Cherry Red (`#D20001`), Black Bean (`#081910`), Bright White (`#FFFFFF`), Cobalt (`#0212EE`), Citrus Zest (`#FFA62B`).

2. **Cuộn Mượt & Chuyển Cảnh Điện Ảnh (Smooth Scroll & Parallax):**
   - Tích hợp bộ đôi **Lenis Scroll** và **GSAP ScrollTrigger**.
   - Gallery 3 cột với hiệu ứng parallax mượt mà không giật lag.
   - Pinned transitions mượt mà khi cuộn qua các phân đoạn `GAMEON LinEup` và `GAMEON MaP`.

3. **Cấu trúc Astro Islands & Zero JS Overhead:**
   - Pre-rendered Static HTML (SSG) giúp tốc độ load trang gần như tức thì.
   - Chia tách giao diện thành các Astro components tái sử dụng:
     - `src/components/HeaderNav.astro`
     - `src/components/IntroOverlay.astro`
     - `src/components/Hero.astro`
     - `src/components/GalleryProjects.astro`
     - `src/components/Lineup.astro`
     - `src/components/MapSection.astro`
     - `src/components/TicketSection.astro`
     - `src/components/Faq.astro`
     - `src/components/Sponsors.astro`
     - `src/components/Footer.astro`
   - Hỗ trợ đa trang (Multi-page routing):
     - `/` : Trang chủ HVC GAMEON
     - `/ticketInfo` : Kiểm tra thông tin E-Ticket
     - `/eticket-form` : Đặt vé điện tử trực tuyến (VietQR)
     - `/paperticket-form` : Đặt vé giấy giao tận nơi
     - `/thanks` : Lời cảm ơn sau khi mua vé
     - `/404` : Trang bảo trì / không tìm thấy

---

## 🚀 Hướng Dẫn Chạy & Phát Triển

### 1. Cài đặt thư viện (nếu cần):
```bash
pnpm install
# hoặc npm install
```

### 2. Chạy môi trường phát triển (Dev server):
```bash
pnpm dev
# hoặc npm run dev
```
Trang web sẽ chạy tại: **`http://localhost:4321`**

### 3. Build sản phẩm tối ưu (Production build):
```bash
pnpm build
```
Toàn bộ mã HTML/CSS/JS tĩnh siêu nhẹ sẽ được tạo tự động tại thư mục `dist/`.

### 4. Xem trước bản build:
```bash
pnpm preview
```
