/**
 * ==============================================================================
 * js/eticket.js - Xử lý logic đặt Vé Điện Tử (E-Ticket)
 * ==============================================================================
 * Chức năng chính:
 * 1. Tính toán giá tiền tự động khi thay đổi số lượng vé (320.000 VNĐ / vé).
 * 2. Xác thực tính hợp lệ của dữ liệu form (Số điện thoại 10 số, số lượng tối đa 5 vé, 
 *    định dạng email, link Facebook cá nhân).
 * 3. Hiển thị popup xác nhận số tiền cần chuyển khoản.
 * 4. Tải ảnh chụp bill chuyển khoản lên dịch vụ ImgBB qua API.
 * 5. Lấy link ảnh từ ImgBB gửi kèm dữ liệu về Google Apps Script (ghi nhận vào Google Sheet).
 * 6. Hiển thị thông báo thành công và chuyển hướng sang trang thanks.html.
 * 7. Vô hiệu hóa chuột phải (contextmenu) và các phím tắt DevTools (F12, Ctrl+U, Ctrl+Shift+I).
 */

// Lấy các phần tử liên quan đến số lượng và giá vé
const quantityInput = document.getElementById("quantity");
const totalDueElement = document.getElementById("total-due");
const subtotalElement = document.getElementById("subtotal");
const quantityDisplayElement = document.getElementById("quantity-display");

// Đơn giá vé cố định
const ticketPrice = 320000;
const vatRate = 0.27;

/**
 * Cập nhật tổng tiền hiển thị trên giao diện theo số lượng vé
 */
function updateTotalDue() {
    const quantity = parseInt(quantityInput.value) || 0;
    const subtotal = ticketPrice * quantity;
    const totalDue = subtotal;
    const formattedPrice1 = subtotal.toLocaleString('vi-VN');
    const formattedPrice2 = totalDue.toLocaleString('vi-VN');

    if (subtotalElement) subtotalElement.textContent = `${formattedPrice1} VNĐ`;
    if (totalDueElement) totalDueElement.textContent = `${formattedPrice2} VNĐ`;
    if (quantityDisplayElement) quantityDisplayElement.textContent = quantity;
}

if (quantityInput) {
    quantityInput.addEventListener("input", updateTotalDue);
    updateTotalDue();
}

/**
 * Hiển thị Popup xác nhận đặt vé và số tiền thanh toán (trả về Promise)
 */
function showConfirmedPopup(message) {
    return new Promise((resolve) => {
        const popupOverlay = document.getElementById("confirmation-popup");
        const popupMessage = document.getElementById("popup-cf-message");
        const popupConfirmBtn = document.getElementById("popup-confirm-btn");
        const popupCloseBtn = document.getElementById("popup-cf-close");

        popupMessage.textContent = message;
        popupOverlay.style.display = 'flex';

        popupConfirmBtn.onclick = function () {
            resolve('confirmed');
            popupOverlay.style.display = 'none';
        };

        popupCloseBtn.onclick = function () {
            resolve('canceled');
            popupOverlay.style.display = 'none';
        };
    });
}

/**
 * Xử lý sự kiện Submit Form đặt vé
 */
const formElement = document.getElementById('form');
if (formElement) {
    formElement.onsubmit = async function (event) {
        event.preventDefault();

        // Thu thập thông tin từ các trường nhập liệu
        const customer = document.getElementById('customer').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;
        const linkfb = document.getElementById('linkfb').value;
        const referrer = document.getElementById('referrer') ? document.getElementById('referrer').value : '';
        const quantity = parseInt(document.getElementById('quantity').value, 10);
        const imageFile = document.getElementById('image') ? document.getElementById('image').files[0] : null;
        const imgbbApiKey = "720f1453f14c2cc6ba0b68214720705f";
        const url = this.action;

        // 1. Kiểm tra tính hợp lệ của số điện thoại (phải là 10 chữ số)
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) {
            showPopup("Số điện thoại bao gồm 10 ký tự");
            return;
        }

        // 2. Kiểm tra số lượng vé (từ 1 đến 5 vé)
        if (quantity <= 0 || quantity > 5) {
            showPopup("Bạn chỉ được mua tối đa 5 vé.");
            return;
        }

        // 3. Kiểm tra các trường bắt buộc
        if (!customer || !phone || !email || !linkfb || quantity <= 0) {
            showPopup("Vui lòng điền đầy đủ thông tin.");
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
            showPopup("Vui lòng nhập link Facebook hợp lệ.");
            return;
        }

        // 6. Hiển thị xác nhận số tiền
        const totalPrice = ticketPrice * quantity;
        const formattedPrice = totalPrice.toLocaleString('vi-VN');
        const message = `Bạn xác nhận thanh toán: ${formattedPrice}đ. Bạn có muốn tiếp tục?`;
        const result = await showConfirmedPopup(message);

        // 7. Nếu người dùng bấm Xác nhận
        if (result === 'confirmed') {
            if (imageFile) {
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
                    <p>Đang chờ hệ thống xử lý...</p>
                    <p>(Có thể mất 5 - 10s)</p>
                    <img src="./images/loading.gif" alt="Loading" style="max-width: 100%; max-height: 100px; object-fit: contain;" />
                `;
                showPopup(loadingMessage, true, true);

                try {
                    // Upload ảnh biên lai chuyển khoản lên ImgBB
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
                            .then(result => {
                                console.log(result);
                                const successMessage = `
                                    <p>Bạn đã đặt vé thành công!</p>
                                    <img src="./images/success.gif" alt="Success GIF" style="max-width: 100%; max-height: 100px; object-fit: contain;" />
                                `;
                                showPopup(successMessage, true, true);
                                // Chuyển hướng sang trang Thanks sau 3 giây
                                setTimeout(() => {
                                    window.location.href = `thanks.html?customer=${encodeURIComponent(customer)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}&quantity=${encodeURIComponent(quantity)}`;
                                }, 3000);
                            })
                            .catch(error => {
                                console.error('Error:', error);
                                showPopup('Đã xảy ra lỗi khi gửi dữ liệu.');
                            });

                        document.getElementById('form').reset();
                    } else {
                        showPopup("Không thể tải ảnh biên lai lên ImgBB.");
                    }
                } catch (error) {
                    console.error("Lỗi khi tải ảnh:", error);
                    showPopup("Lỗi kết nối khi tải ảnh lên ImgBB.");
                }
            } else {
                showPopup("Vui lòng chọn ảnh chụp chuyển khoản.");
            }
        }
    };
}

/**
 * Hiển thị Popup thông báo chung
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

    if (hideCloseButton && popupCloseButton) {
        popupCloseButton.style.display = "none";
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
 * Kiểm tra định dạng và tên miền của địa chỉ Email
 */
function validateEmail(email) {
    const commonDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return { isValid: false, message: "Vui lòng nhập email hợp lệ." };
    }

    const domain = email.split('@')[1];
    if (domain) {
        if (!commonDomains.includes(domain) && !domain.endsWith('.edu.vn')) {
            return { isValid: false, message: `Email của bạn không hợp lệ (hỗ trợ Gmail, Yahoo, Outlook hoặc đuôi .edu.vn).` };
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

// Chống lưu trang bằng Ctrl+S
document.addEventListener('keydown', function (event) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isCtrlOrCommand = isMac ? event.metaKey : event.ctrlKey;

    if (isCtrlOrCommand && event.key.toLowerCase() === 's') {
        event.preventDefault();
        alert("Chức năng lưu trang đã bị vô hiệu hóa!");
    }
});
