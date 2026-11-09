/**
 * ==============================================================================
 * js/eticket.js - Xử lý logic đặt vé E-Ticket & Tạo mã VietQR động real-time
 * ==============================================================================
 * Chức năng chính:
 * 1. Tự động tính tổng tiền thanh toán: Số lượng vé * 320.000 VNĐ (từ 1 đến 5 vé).
 * 2. Tạo mã VietQR động theo API img.vietqr.io:
 *    - Tự động điền Ngân hàng (VCB), Số TK (1024521600), Tên chủ TK (Nguyen Thi Thu Phuong).
 *    - Cập nhật số tiền chuẩn xác theo số lượng vé đã chọn.
 *    - Tự động ghép nội dung chuyển khoản: <Số lượng vé> <Tên khách> <Số điện thoại>.
 *    - Chuẩn hóa xóa dấu tiếng Việt (ví dụ: "Nguyễn Văn A" -> "Nguyen Van A") để tránh lỗi hiển thị ngân hàng.
 *    - Lắng nghe sự kiện input real-time ở các ô: Họ tên, Số điện thoại, Số lượng vé.
 * 3. Kiểm tra tính hợp lệ của dữ liệu (Validate SĐT 10 số, Email, link Facebook, ảnh bill).
 * 4. Tải ảnh bill chuyển khoản lên ImgBB và gửi dữ liệu form về Google Sheet.
 */

// 1. Cấu hình thông tin tài khoản ngân hàng nhận tiền
const BANK_CONFIG = {
    bankId: 'VCB',                           // Vietcombank
    accountNo: '1024521600',                 // Số tài khoản nhận tiền
    accountName: 'Nguyen Thi Thu Phuong',    // Tên chủ tài khoản
    ticketPrice: 320000,                     // Đơn giá 1 vé (VNĐ)
    template: 'compact2'                     // Mẫu mã QR VietQR (hiển thị đầy đủ logo, info tài khoản)
};

// 2. Lấy các phần tử DOM phục vụ tính tiền và tạo QR
const quantityInput = document.getElementById("quantity");
const customerInput = document.getElementById("customer");
const phoneInput = document.getElementById("phone");
const totalDueElement = document.getElementById("total-due");
const quantityDisplayElement = document.getElementById("quantity-display");
const vietqrImg = document.getElementById("vietqr-img");
const qrAmountDisplay = document.getElementById("qr-amount-display");
const qrMemoDisplay = document.getElementById("qr-memo-display");

/**
 * Hàm loại bỏ dấu tiếng Việt và ký tự đặc biệt, chuẩn hóa chữ không dấu
 * Giúp nội dung chuyển khoản không bị lỗi font trên các ứng dụng ngân hàng
 * @param {string} str - Chuỗi có dấu
 * @returns {string} - Chuỗi không dấu viết hoa/viết chuẩn
 */
function removeVietnameseTones(str) {
    if (!str) return '';
    str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    str = str.replace(/đ/g, 'd').replace(/Đ/g, 'D');
    // Thay thế ký tự không phải chữ và số thành dấu cách
    str = str.replace(/[^a-zA-Z0-9 ]/g, ' ');
    // Bỏ khoảng trắng thừa
    str = str.replace(/\s+/g, ' ').trim();
    return str;
}

/**
 * Cập nhật tổng tiền và tạo lại link VietQR động trong thời gian thực (Real-time)
 */
function updatePaymentAndVietQR() {
    // Lấy số lượng vé (giới hạn 1 - 5)
    let quantity = parseInt(quantityInput ? quantityInput.value : 1, 10);
    if (isNaN(quantity) || quantity < 1) quantity = 1;
    if (quantity > 5) quantity = 5;

    // Tính tổng tiền
    const totalAmount = quantity * BANK_CONFIG.ticketPrice;
    const formattedPrice = totalAmount.toLocaleString('vi-VN') + ' VNĐ';

    // Cập nhật số tiền ra giao diện
    if (totalDueElement) totalDueElement.textContent = formattedPrice;
    if (quantityDisplayElement) quantityDisplayElement.textContent = quantity;
    if (qrAmountDisplay) qrAmountDisplay.textContent = formattedPrice;

    // Lấy tên khách hàng và số điện thoại, loại bỏ dấu tiếng Việt
    const rawCustomer = customerInput ? customerInput.value.trim() : '';
    const rawPhone = phoneInput ? phoneInput.value.trim() : '';

    const cleanCustomer = removeVietnameseTones(rawCustomer);
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');

    // Cú pháp nội dung chuyển khoản: <Số lượng vé> <Tên khách> <Số điện thoại>
    // Ví dụ: "1 VE", hoặc "2 NGUYEN VAN A 0912345678"
    let memoParts = [`${quantity} VE`];
    if (cleanCustomer) memoParts.push(cleanCustomer.toUpperCase());
    if (cleanPhone) memoParts.push(cleanPhone);
    const transferMemo = memoParts.join(' ');

    if (qrMemoDisplay) {
        qrMemoDisplay.textContent = transferMemo;
    }

    // Tạo link ảnh VietQR API theo chuẩn:
    // https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<MEMO>&accountName=<NAME>
    const qrUrl = `https://img.vietqr.io/image/${BANK_CONFIG.bankId}-${BANK_CONFIG.accountNo}-${BANK_CONFIG.template}.png?amount=${totalAmount}&addInfo=${encodeURIComponent(transferMemo)}&accountName=${encodeURIComponent(BANK_CONFIG.accountName)}`;

    // Cập nhật thẻ ảnh QR Code
    if (vietqrImg) {
        vietqrImg.src = qrUrl;
    }
}

// 3. Lắng nghe các sự kiện thay đổi để cập nhật VietQR ngay lập tức
if (quantityInput) {
    quantityInput.addEventListener("input", updatePaymentAndVietQR);
    quantityInput.addEventListener("change", updatePaymentAndVietQR);
}
if (customerInput) {
    customerInput.addEventListener("input", updatePaymentAndVietQR);
}
if (phoneInput) {
    phoneInput.addEventListener("input", updatePaymentAndVietQR);
}

// Khởi chạy ngay lần đầu tải trang để hiện mã QR mặc định
updatePaymentAndVietQR();

/**
 * Hiển thị Popup xác nhận trước khi thanh toán
 */
function showConfirmedPopup(message) {
    return new Promise((resolve) => {
        const popupOverlay = document.getElementById("confirmation-popup");
        const popupMessage = document.getElementById("popup-cf-message");
        const popupConfirmBtn = document.getElementById("popup-confirm-btn");
        const popupCloseBtn = document.getElementById("popup-cf-close");

        if (popupMessage) popupMessage.textContent = message;
        if (popupOverlay) popupOverlay.style.display = 'flex';

        if (popupConfirmBtn) {
            popupConfirmBtn.onclick = function () {
                resolve('confirmed');
                if (popupOverlay) popupOverlay.style.display = 'none';
            };
        }

        if (popupCloseBtn) {
            popupCloseBtn.onclick = function () {
                resolve('canceled');
                if (popupOverlay) popupOverlay.style.display = 'none';
            };
        }
    });
}

/**
 * Xử lý sự kiện gửi Form mua vé
 */
const formElement = document.getElementById('form');
if (formElement) {
    formElement.onsubmit = async function (event) {
        event.preventDefault();

        // Thu thập thông tin từ các trường input
        const customer = document.getElementById('customer').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const email = document.getElementById('email').value.trim();
        const linkfb = document.getElementById('linkfb').value.trim();
        const referrer = document.getElementById('referrer') ? document.getElementById('referrer').value.trim() : '';
        const quantity = parseInt(document.getElementById('quantity').value, 10);
        const imageFile = document.getElementById('image') ? document.getElementById('image').files[0] : null;
        const imgbbApiKey = "720f1453f14c2cc6ba0b68214720705f";
        const url = this.action;

        // 1. Kiểm tra số điện thoại (10 chữ số)
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) {
            showPopup("Số điện thoại phải bao gồm đúng 10 chữ số.");
            return;
        }

        // 2. Kiểm tra số lượng vé hợp lệ (1 đến 5)
        if (isNaN(quantity) || quantity < 1 || quantity > 5) {
            showPopup("Bạn chỉ được mua từ 1 đến tối đa 5 vé mỗi lượt.");
            return;
        }

        // 3. Kiểm tra các trường bắt buộc
        if (!customer || !phone || !email || !linkfb) {
            showPopup("Vui lòng điền đầy đủ các thông tin bắt buộc (*).");
            return;
        }

        // 4. Kiểm tra định dạng email
        const emailValidationResult = validateEmail(email);
        if (!emailValidationResult.isValid) {
            showPopup(emailValidationResult.message);
            return;
        }

        // 5. Kiểm tra định dạng link Facebook
        if (!isValidFacebookLink(linkfb)) {
            showPopup("Vui lòng nhập đường link Facebook hợp lệ (ví dụ: https://facebook.com/...)");
            return;
        }

        // 6. Kiểm tra đã chọn ảnh bill chuyển khoản hay chưa
        if (!imageFile) {
            showPopup("Vui lòng upload ảnh chụp hóa đơn / biên lai chuyển khoản.");
            return;
        }

        // 7. Hiển thị popup xác nhận thanh toán
        const totalAmount = quantity * BANK_CONFIG.ticketPrice;
        const formattedPrice = totalAmount.toLocaleString('vi-VN');
        const confirmMessage = `Bạn xác nhận mua ${quantity} vé với tổng số tiền ${formattedPrice} VNĐ?`;
        const result = await showConfirmedPopup(confirmMessage);

        if (result === 'confirmed') {
            const formData = new FormData();
            formData.append("Customer", customer);
            formData.append("Phone", phone);
            formData.append("Email", email);
            formData.append("Facebook", linkfb);
            formData.append("Quantity", quantity);
            formData.append("Referrer", referrer);
            formData.append("image", imageFile);

            // Hiển thị trạng thái đang xử lý tải ảnh
            const loadingMessage = `
                <p style="font-weight: bold; margin-bottom: 5px;">Đang xử lý đơn hàng...</p>
                <p style="font-size: 0.9rem; color: #555;">(Quá trình có thể mất 5 - 10 giây)</p>
                <img src="./images/loading.gif" alt="Đang xử lý" style="max-width: 80px; margin-top: 10px;" />
            `;
            showPopup(loadingMessage, true, true);

            try {
                // Tải ảnh bill lên ImgBB
                const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
                    method: "POST",
                    body: formData
                });

                const imgbbData = await imgbbResponse.json();

                if (imgbbData.success) {
                    const imageUrl = imgbbData.data.url;
                    formData.append("Image", imageUrl);

                    // Gửi toàn bộ dữ liệu đơn hàng (kèm link ảnh) về Google Apps Script
                    await fetch(url, {
                        method: 'POST',
                        body: formData
                    })
                        .then(response => response.json())
                        .then(res => {
                            console.log('Google Script Response:', res);
                            const successMessage = `
                                <p style="font-weight: bold; color: #28a745; font-size: 1.1rem;">Đặt vé thành công!</p>
                                <p>Hệ thống đã ghi nhận đơn vé của bạn.</p>
                                <img src="./images/success.gif" alt="Thành công" style="max-width: 80px; margin-top: 10px;" />
                            `;
                            showPopup(successMessage, true, true);

                            // Chuyển hướng sang trang Thanks sau 3 giây
                            setTimeout(() => {
                                window.location.href = `thanks.html?customer=${encodeURIComponent(customer)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}&quantity=${encodeURIComponent(quantity)}`;
                            }, 3000);
                        })
                        .catch(err => {
                            console.error('Lỗi khi gửi Google Apps Script:', err);
                            showPopup('Đã xảy ra lỗi khi lưu thông tin đơn vé. Vui lòng thử lại.');
                        });

                    formElement.reset();
                    updatePaymentAndVietQR();
                } else {
                    showPopup("Không thể tải ảnh minh chứng lên máy chủ lưu trữ (ImgBB).");
                }
            } catch (err) {
                console.error("Lỗi khi tải ảnh:", err);
                showPopup("Lỗi kết nối khi tải ảnh bill chuyển khoản.");
            }
        }
    };
}

/**
 * Hiển thị Popup thông báo
 */
function showPopup(message, isHtml = false, hideCloseButton = false) {
    const popup = document.getElementById("popup");
    const popupMessage = document.getElementById("popup-message");
    const popupCloseButton = document.getElementById("popup-close");

    if (!popup || !popupMessage) return;

    if (isHtml) {
        popupMessage.innerHTML = message;
    } else {
        popupMessage.textContent = message;
    }

    if (popupCloseButton) {
        popupCloseButton.style.display = hideCloseButton ? "none" : "inline-block";
    }

    popup.style.display = "flex";
}

/**
 * Đóng Popup thông báo
 */
function closePopup() {
    const popup = document.getElementById("popup");
    if (popup) popup.style.display = "none";
}

const popupCloseBtn = document.getElementById("popup-close");
if (popupCloseBtn) {
    popupCloseBtn.addEventListener("click", closePopup);
}

/**
 * Kiểm tra định dạng link Facebook cá nhân
 */
function isValidFacebookLink(link) {
    const facebookLinkRegex = /^https?:\/\/(www\.)?facebook\.com\/.+$/;
    return facebookLinkRegex.test(link);
}

/**
 * Kiểm tra định dạng Email
 */
function validateEmail(email) {
    const commonDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return { isValid: false, message: "Vui lòng nhập định dạng email hợp lệ." };
    }

    const domain = email.split('@')[1];
    if (domain) {
        if (!commonDomains.includes(domain) && !domain.endsWith('.edu.vn')) {
            return { isValid: false, message: "Email không thuộc danh sách hỗ trợ (Gmail, Yahoo, Outlook hoặc .edu.vn)." };
        }
    }

    return { isValid: true, message: "" };
}

// Chống click chuột phải xem mã nguồn
document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
});

// Chống mở DevTools bằng phím tắt
document.addEventListener('keydown', function (e) {
    if (e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
    }
});
