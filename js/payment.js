/**
 * ==============================================================================
 * js/payment.js - Quản lý Modal Popup thanh toán / điều khoản
 * ==============================================================================
 * Chức năng:
 * 1. Mở modal khi bấm vào nút #openModal.
 * 2. Đóng modal khi bấm nút #closeModal ('x').
 * 3. Đóng modal khi nhấp ra bên ngoài vùng nội dung modal.
 */

// Lấy các phần tử DOM liên quan đến Modal
const modal = document.getElementById("modal");
const openModalButton = document.getElementById("openModal");
const closeModalButton = document.getElementById("closeModal");

// Mở modal khi bấm nút
if (openModalButton && modal) {
    openModalButton.onclick = function() {
        modal.style.display = "flex";
    };
}

// Đóng modal khi bấm nút 'x'
if (closeModalButton && modal) {
    closeModalButton.onclick = function() {
        modal.style.display = "none";
    };
}

// Đóng modal khi nhấp chuột ra ngoài vùng nội dung modal
window.addEventListener("click", function(event) {
    if (modal && event.target === modal) {
        modal.style.display = "none";
    }
});
