/**
 * ==============================================================================
 * js/paperticket.js - Xử lý logic đặt Vé Giấy (Paper Ticket)
 * ==============================================================================
 * Chức năng:
 * 1. Tự động tính tiền theo số lượng vé (giá: 320.000 VNĐ / vé).
 * 2. Cho phép người dùng lựa chọn giữa 2 phương thức thanh toán:
 *    - 'transfer' (Chuyển khoản): Bắt buộc tải ảnh minh chứng chuyển khoản lên ImgBB.
 *    - 'cash' (Tiền mặt): Không yêu cầu ảnh minh chứng.
 * 3. Kiểm tra tính hợp lệ dữ liệu (Số điện thoại 10 số, Email, link Facebook, số lượng vé tối đa 5).
 * 4. Gửi dữ liệu đơn đặt vé giấy về Google Apps Script để lưu vào Google Sheet.
 * 5. Hiển thị thông báo hoàn tất và chuyển sang thanks.html.
 */

// Lấy các phần tử DOM phục vụ tính tiền vé
const quantityInput = document.getElementById("quantity");
const totalDueElement = document.getElementById("total-due");
const subtotalElement = document.getElementById("subtotal");
const quantityDisplayElement = document.getElementById("quantity-display");

const ticketPrice = 320000;

/**
 * Cập nhật tổng tiền hiển thị trên giao diện
 */
function updateTotalDue() {
    const quantity = parseInt(quantityInput.value) || 0;
    const subtotal = ticketPrice * quantity;
    const totalDue = subtotal;

    if (subtotalElement) subtotalElement.textContent = `${subtotal.toLocaleString()} VNĐ`;
    if (totalDueElement) totalDueElement.textContent = `${totalDue.toLocaleString()} VNĐ`;
    if (quantityDisplayElement) quantityDisplayElement.textContent = quantity;
}

if (quantityInput) {
    quantityInput.addEventListener("input", updateTotalDue);
    updateTotalDue();
}

/**
 * Hiển thị Popup xác nhận đặt vé và số tiền thanh toán (Promise)
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

// Xử lý chuyển đổi phương thức thanh toán (Tiền mặt / Chuyển khoản)
const paymentMethodSelect = document.getElementById("payment-method");
const transferSection = document.getElementById("transfer-section");
const bankingDetail = document.getElementById("banking-detail");

if (paymentMethodSelect) {
    paymentMethodSelect.addEventListener("change", function () {
        if (this.value === "transfer") {
            // Hiện khu vực quét QR và thông tin chuyển khoản
            if (transferSection) transferSection.style.display = "block";
            if (bankingDetail) bankingDetail.style.display = "block";
        } else {
            // Ẩn khu vực chuyển khoản nếu chọn trả tiền mặt
            if (transferSection) transferSection.style.display = "none";
            if (bankingDetail) bankingDetail.style.display = "none";
        }
    });
}

/**
 * Xử lý submit Form đặt vé giấy
 */
const paperForm = document.getElementById('form');
if (paperForm) {
    paperForm.onsubmit = async function (event) {
        event.preventDefault();

        const customer = document.getElementById('customer').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;
        const linkfb = document.getElementById('linkfb').value;
        const address = document.getElementById('address').value;
        const quantity = parseInt(document.getElementById('quantity').value, 10);
        const type = document.getElementById('payment-method').value;
        const note = document.getElementById('note') ? document.getElementById('note').value : '';
        const referrer = document.getElementById('referrer') ? document.getElementById('referrer').value : '';
        const imageFile = document.getElementById('image') ? document.getElementById('image').files[0] : null;
        const imgbbApiKey = "720f1453f14c2cc6ba0b68214720705f";
        const url = this.action;
        const currentTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

        // 1. Kiểm tra số điện thoại (10 chữ số)
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) {
            showPopup("Số điện thoại bao gồm 10 ký tự.");
            return;
        }

        // 2. Kiểm tra số lượng vé hợp lệ (1 - 5 vé)
        if (quantity <= 0 || quantity > 5) {
            showPopup("Bạn chỉ được mua tối đa 5 vé.");
            return;
        }

        // 3. Kiểm tra các trường bắt buộc
        if (!customer || !phone || !email || !linkfb || !address || quantity <= 0) {
            showPopup("Vui lòng điền đầy đủ thông tin.");
            return;
        }

        // 4. Kiểm tra email
        const emailValidationResult = validateEmail(email);
        if (!emailValidationResult.isValid) {
            showPopup(emailValidationResult.message); 
            return;
        }

        // 5. Kiểm tra link Facebook
        if (!isValidFacebookLink(linkfb)) {
            showPopup("Vui lòng nhập link Facebook hợp lệ.");
            return;
        }

        // 6. Hiển thị xác nhận số tiền
        const totalPrice = ticketPrice * quantity;
        const formattedPrice = totalPrice.toLocaleString('vi-VN');
        const message = `Bạn xác nhận thanh toán: ${formattedPrice}đ. Bạn có muốn tiếp tục?`;
        const result = await showConfirmedPopup(message);

        if (result === 'confirmed') {
            const formData = new FormData();
            formData.append("Time", currentTime);
            formData.append("Customer", customer);
            formData.append("Phone", phone);
            formData.append("Email", email);
            formData.append("Facebook", linkfb);
            formData.append("Address", address);
            formData.append("Quantity", quantity);
            formData.append("Type", type);
            formData.append("Note", note);
            formData.append("Referrer", referrer);

            // Nếu thanh toán chuyển khoản: cần upload bill lên ImgBB trước
            if (type === 'transfer') {
                if (imageFile) {
                    formData.append("image", imageFile);

                    const loadingMessage = `
                        <p>Đang chờ hệ thống xử lý...</p>
                        <p>(Có thể mất 5 - 10s)</p>
                        <img src="./images/loading.gif" alt="Loading" style="max-width: 100%; max-height: 100px; object-fit: contain;" />
                    `;
                    showPopup(loadingMessage, true, true);

                    try {
                        const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
                            method: "POST",
                            body: formData
                        });

                        const imgbbData = await imgbbResponse.json();

                        if (imgbbData.success) {
                            const imageUrl = imgbbData.data.url;
                            formData.append("Image", imageUrl);
                            await submitFormData(formData, url, customer, email, phone, quantity);
                        } else {
                            showPopup("Không thể tải ảnh minh chứng lên ImgBB.");
                        }
                    } catch (error) {
                        console.error("Lỗi khi tải ảnh:", error);
                        showPopup("Lỗi kết nối khi tải ảnh lên ImgBB.");
                    }
                } else {
                    showPopup("Vui lòng chọn ảnh minh chứng chuyển khoản.");
                }
            } else {
                // Nếu thanh toán tiền mặt: gửi trực tiếp
                const loadingMessage = `
                    <p>Đang chờ hệ thống xử lý...</p>
                    <p>(Có thể mất 5 - 10s)</p>
                    <img src="./images/loading.gif" alt="Loading" style="max-width: 100%; max-height: 100px; object-fit: contain;" />
                `;
                showPopup(loadingMessage, true, true);

                await submitFormData(formData, url, customer, email, phone, quantity);
            }
        }
    };
}

/**
 * Gửi dữ liệu đơn đặt vé giấy sang Google Apps Script
 */
async function submitFormData(formData, url, customer, email, phone, quantity) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        console.log(result);
        
        const successMessage = `
            <p>Bạn đã đặt vé thành công!</p>
            <img src="./images/success.gif" alt="Success GIF" style="max-width: 100%; max-height: 100px; object-fit: contain;" />
        `;
        showPopup(successMessage, true, true);
        
        setTimeout(() => {
            window.location.href = `thanks.html?customer=${encodeURIComponent(customer)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}&quantity=${encodeURIComponent(quantity)}`;
        }, 3000);
        
        document.getElementById('form').reset();
    } catch (error) {
        console.error('Error:', error);
        showPopup('Đã xảy ra lỗi khi gửi dữ liệu.');
    }
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

    if (hideCloseButton && popupCloseButton) {
        popupCloseButton.style.display = "none";
    }

    popup.style.display = "flex";
}

function closePopup() {
    const popup = document.getElementById("popup");
    if (popup) popup.style.display = "none";
}

const paperCloseBtn = document.getElementById("popup-close");
if (paperCloseBtn) {
    paperCloseBtn.addEventListener("click", closePopup);
}

function isValidFacebookLink(link) {
    const facebookLinkRegex = /^https?:\/\/(www\.)?facebook\.com\/.+$/;
    return facebookLinkRegex.test(link);
}

function validateEmail(email) {
    const commonDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return { isValid: false, message: "Vui lòng nhập email hợp lệ." };
    }

    const domain = email.split('@')[1];
    if (domain) {
        if (!commonDomains.includes(domain) && !domain.endsWith('.edu.vn')) {
            return { isValid: false, message: `Email không hợp lệ (hỗ trợ Gmail, Yahoo, Outlook hoặc đuôi .edu.vn).` };
        }
    }

    return { isValid: true, message: "" };
}

// Chống mở menu chuột phải
document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
});

// Chống mở DevTools
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
