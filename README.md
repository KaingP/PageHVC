# HÙNG VƯƠNG CONCERT (HVC: UNFOLD) - TÀI LIỆU DỰ ÁN

Tài liệu này cung cấp cái nhìn tổng quan về cấu trúc, luồng hoạt động và chức năng từng thành phần trong dự án website **Hùng Vương Concert** để bất kỳ thành viên nào cũng có thể đọc hiểu và phát triển tiếp một cách dễ dàng.

---

## 1. Tổng Quan Dự Án
- **Tên dự án:** Website Giới thiệu & Đặt vé Hùng Vương Concert: UNFOLD.
- **Mục đích:** Giới thiệu sự kiện âm nhạc gây quỹ từ thiện thường niên của THPT chuyên Hùng Vương, bán vé (vé điện tử & vé giấy), kiểm tra mã vé, truyền thông nhà tài trợ và nghệ sĩ.
- **Công nghệ cốt lõi:**
  - **Frontend:** HTML5, CSS3, JavaScript thuần (Vanilla JS).
  - **Hiệu ứng & Cuộn mượt:** [GSAP 3](https://greensock.com/gsap/) (GreenSock), [ScrollTrigger](https://greensock.com/scrolltrigger/), [Lenis Scroll](https://github.com/darkroomengineering/lenis).
  - **Dịch vụ tích hợp bên ngoài:**
    - Google Apps Script & Google Sheet API (lưu trữ và tra cứu thông tin đặt vé).
    - ImgBB API (upload ảnh minh chứng chuyển khoản).

---

## 2. Cấu Trúc Thư Mục & File

```text
hungvuongconcert/
│
├── index.html               # Trang chủ chính (Landing Page, Lineup nghệ sĩ, Nhà tài trợ, FAQ...)
├── eticket-form.html        # Trang biểu mẫu đăng ký mua Vé Điện Tử (E-Ticket)
├── paperticket-form.html    # Trang biểu mẫu đăng ký mua Vé Giấy (Paper Ticket)
├── ticketInfo.html          # Trang tra cứu / kiểm tra thông tin vé đã đặt qua mã vé
├── thanks.html              # Trang cảm ơn sau khi hoàn tất gửi form đặt vé
├── 404.html                 # Trang báo lỗi 404 khi vào đường dẫn không tồn tại
├── CNAME                    # Cấu hình Custom Domain (GitHub Pages)
│
├── js/                      # Thư mục mã nguồn JavaScript
│   ├── animation.js         # Khởi tạo Lenis, ScrollTrigger và render album ảnh từ data.js
│   ├── data.js              # Danh sách mảng dữ liệu ảnh/video trưng bày ở trang chủ
│   ├── eticket.js           # Xử lý logic đặt vé điện tử, validate dữ liệu, upload ảnh ImgBB, gửi Google Sheet
│   ├── paperticket.js       # Xử lý logic đặt vé giấy (hỗ trợ chuyển khoản hoặc tiền mặt)
│   ├── ticketInfo.js        # Logic truy vấn Google Sheets qua Google Visualization API để tra cứu mã vé
│   ├── talent.js            # Hiệu ứng hover mở rộng danh thiếp/ảnh nghệ sĩ khách mời (Talent Showcase)
│   └── payment.js           # Tiện ích liên quan thanh toán
│
├── scripts.js               # Hiệu ứng mở đầu (Intro Overlay video + hiệu ứng clipPath chuyển cảnh)
│
├── style/                   # Thư mục các file giao diện CSS
│   ├── style.css            # CSS cốt lõi trang chủ (Reset, Overlay, Layout cơ bản)
│   ├── style_linked.css     # CSS nâng cao cho Animation, Grid các khối ảnh, hiệu ứng di chuột
│   ├── talent.css           # Giao diện khu vực nghệ sĩ khách mời (Lineup/Talent)
│   ├── stage.css            # Giao diện sân khấu, sơ đồ vé & khu vực mua vé
│   ├── payment.css          # Giao diện form thanh toán vé điện tử
│   ├── offline-payment.css  # Giao diện form đặt vé giấy
│   ├── ticketinfo.css       # Giao diện trang tra cứu mã vé
│   ├── 404.css              # Giao diện trang 404
│   └── test.css             # Giao diện trang Thanks
│
├── fonts/                   # Font chữ tùy chỉnh (Coolvetica, DFVN 36daysoftype, Ganh Type)
├── images/                  # Toàn bộ hình ảnh, logo, video nền led-web.mp4
│   ├── bubble/              # Hình ảnh bong bóng trang trí
│   ├── casi/                # Ảnh các nghệ sĩ/ca sĩ khách mời
│   ├── data/                # Hình ảnh kỷ niệm/hoạt động load động vào trang chủ
│   ├── kv/                  # Key Visual, hình nền các section
│   ├── logo-ntt/            # Logo các nhà tài trợ
│   └── social-logo/         # Icon mạng xã hội
```

---

## 3. Chi Tiết Chức Năng Của Từng Trang & Module

### 3.1. Trang Chủ (`index.html`)
- **Màn hình Intro (`.overlay`):** 
  - Chạy video nền `images/led-web.mp4`.
  - Được điều khiển bởi `scripts.js`: Khi người dùng click bất kỳ đâu, hiệu ứng GSAP `clipPath` sẽ thu nhỏ lớp overlay và mở ra trang chủ.
- **Khu vực Album Trình Diễn (`.projects`):**
  - Đọc dữ liệu từ `js/data.js` (`dataCol1`, `dataCol2`, `dataCol3`).
  - `js/animation.js` nạp các ảnh vào 3 cột và kết hợp cuộn mượt (`Lenis`) + hiệu ứng lệch tốc độ (`ScrollTrigger difference`).
- **Khu vực Nghệ sĩ (`#talent-section`):**
  - Hiển thị danh sách khách mời.
  - `js/talent.js` điều khiển tương tác di chuột (hover vào nghệ sĩ nào thì thẻ đó giãn rộng, thẻ khác thu hẹp lại).
- **Khu vực Nhà tài trợ (`.ntt-logo`):**
  - Hiệu ứng logo chạy vô tận (Marquee animation).

---

### 3.2. Đặt Vé Điện Tử (`eticket-form.html` & `js/eticket.js`)
- Tự động tính tổng tiền theo số lượng vé (giá mặc định: 320.000 VNĐ/vé, tối đa 5 vé).
- **Kiểm tra hợp lệ:** Số điện thoại đủ 10 số, kiểm tra định dạng email, kiểm tra link Facebook cá nhân.
- **Minh chứng chuyển khoản:** 
  - Ảnh chụp màn hình chuyển khoản được nén và upload lên dịch vụ lưu trữ ảnh miễn phí **ImgBB**.
  - URL ảnh sau khi upload sẽ được đính kèm vào dữ liệu form gửi về Google Apps Script để ghi nhận trên Google Sheet.
- Sau khi thành công, chuyển hướng sang `thanks.html`.

---

### 3.3. Đặt Vé Giấy (`paperticket-form.html` & `js/paperticket.js`)
- Cho phép chọn 2 hình thức thanh toán: **Chuyển khoản (transfer)** hoặc **Tiền mặt (cash)**.
- Tự động hiển thị/ẩn khu vực quét mã QR ngân hàng tùy theo phương thức thanh toán được chọn.

---

### 3.4. Tra Cứu Thông Tin Vé (`ticketInfo.html` & `js/ticketInfo.js`)
- Người dùng nhập Mã vé (Ticket Code).
- Script dùng Google Visualization API (`/gviz/tq`) truy vấn trực tiếp vào Google Spreadsheet của Ban tổ chức mà không cần dựng backend riêng.
- Hiển thị tên người mua, số điện thoại và email tương ứng với mã vé.

---

## 4. Hướng Dẫn Chạy Trang Web

- **Chạy trực tiếp trên máy tính:**
  ```powershell
  start index.html
  ```
  *(Các đường dẫn font và script đã được tối ưu hóa tương đối, hoạt động tốt cả khi mở file trực tiếp `file:///` lẫn qua HTTP server).*

- **Chạy bằng Local Server (khuyên dùng khi phát triển tiếp):**
  - Dùng extension **Live Server** trong VS Code (Chuột phải vào `index.html` -> *Open with Live Server*).
  - Hoặc bằng dòng lệnh:
    ```bash
    npx serve .
    # hoặc
    python -m http.server 8000
    ```
