/**
 * ==============================================================================
 * scripts.js - Quản lý hiệu ứng màn hình mở đầu (Intro Overlay)
 * ==============================================================================
 * Chức năng chính:
 * 1. Khởi tạo hiệu ứng xuất hiện cho các dòng chữ tiêu đề mở màn (h2 div) bằng GSAP.
 * 2. Lắng nghe sự kiện người dùng nhấp chuột (click) vào bất kỳ vị trí nào trên màn hình Overlay.
 * 3. Khi nhấp: 
 *    - Các dòng chữ trượt lên trên và biến mất.
 *    - Lớp phủ .overlay thu hẹp clipPath về 0% (biến mất hoàn toàn sau 2 giây) để lộ trang chủ.
 */

// 1. Hiệu ứng chữ chạy từ dưới trượt lên khi vừa tải trang
gsap.from("h2 div", 1.5, {
    yPercent: 100,
    ease: "power4.inOut",
    stagger: {
        amount: 0.5,
    },
    delay: 0.5
});

// 2. Hiệu ứng mở rộng khung nhìn (clipPath) cho chữ h2
gsap.to("h2", 1.5, {
    clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
    ease: "power4.inOut",
    stagger: {
        amount: 0.5,
    },
});

// 3. Khi DOM sẵn sàng, gán sự kiện click vào màn hình Overlay để chuyển vào trang chủ
document.addEventListener("DOMContentLoaded", function() {
    let overlay = document.querySelector(".overlay");
    if (!overlay) return;

    overlay.addEventListener("click", function() {
        // Đẩy toàn bộ chữ tiêu đề lên phía trên
        gsap.to("h2 div", 1.5, {
            yPercent: -100,
            ease: "power4.inOut",
            stagger: {
                amount: 0.5,
            },
        });

        // Cắt bớt phần hiển thị của thẻ h2
        gsap.to("h2", 1.5, {
            clipPath: "polygon(0 85%, 100% 85%, 100% 100%, 0% 100%)",
            ease: "power4.inOut",
            stagger: {
                amount: 0.5,
            },
        }, 0);
       
        // Thu nhỏ hoàn toàn lớp phủ .overlay để lộ ra nội dung chính của website
        gsap.to(".overlay", 2, {
            clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
            ease: "power4.inOut",
            delay: 1
        });
    });
});
