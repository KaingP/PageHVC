/**
 * ==============================================================================
 * js/ticketInfo.js - Tra cứu thông tin vé qua Google Spreadsheet API
 * ==============================================================================
 * Chức năng:
 * 1. Khi người dùng nhập Mã vé (Ticket Code) và bấm Tìm kiếm:
 *    - Gửi request đến Google Visualization API (`/gviz/tq`).
 *    - Tìm kiếm mã vé trong sheet "Online tickets" (các cột chứa mã vé S, T, U, V, W).
 * 2. Lấy về thông tin: Họ và tên, Email, Số điện thoại tương ứng với mã vé đó.
 * 3. Hiển thị thông báo chào mừng và thông tin vé lên màn hình.
 * 4. Chặn phím tắt xem nguồn trang và vô hiệu hóa menu chuột phải.
 */

// ID của bảng tính Google Sheet chứa danh sách vé của Ban tổ chức
const sheetID = '195hTpX4Wj9YN9bH6Ytcxa-ccm2l-m5Wwnzo5T-sMACI';
const base = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?`;
const sheetName = 'Online tickets';
const output = document.querySelector('.output');

/**
 * Hàm gọi Google Sheets API để tra cứu mã vé
 * @param {string} ticketCode - Mã vé người dùng nhập vào
 */
function fetchData(ticketCode) {
    // Truy vấn dữ liệu: Lấy Cột A (Tên), B (SĐT), C (Email) từ các cột chứa mã vé S, T, U, V, W
    const query = `SELECT A,B,C WHERE S = '${ticketCode}' OR T = '${ticketCode}' OR U = '${ticketCode}' OR V = '${ticketCode}' OR W = '${ticketCode}'`;
    const requestUrl = `${base}&sheet=${encodeURIComponent(sheetName)}&tq=${encodeURIComponent(query)}`;

    fetch(requestUrl)
        .then(response => response.text())
        .then(dataText => {
            try {
                // Phản hồi của Google Visualization API được bọc trong hàm google.visualization.Query.setResponse(...)
                // Cắt bỏ phần bọc ngoài để lấy chuỗi JSON thuần
                const jsonText = dataText.substring(dataText.indexOf('{'), dataText.lastIndexOf('}') + 1);
                const jsonData = JSON.parse(jsonText);

                if (!jsonData.table || !jsonData.table.rows || jsonData.table.rows.length === 0) {
                    throw 'Không tìm thấy dữ liệu cho mã vé này.';
                }

                // Lấy hàng dữ liệu đầu tiên tìm thấy
                const rowData = jsonData.table.rows[0].c;
                const customerName = rowData[0]?.v || 'Không có thông tin';
                const customerPhone = rowData[1]?.v || 'Không có thông tin';
                const customerEmail = rowData[2]?.v || 'Không có thông tin';

                // Render kết quả tra cứu ra màn hình
                output.innerHTML = `
                    <h3><i>BẠN ĐÃ LÀ MỘT PHẦN CỦA CONCERT GAMEON NĂM NAY!</i></h3>
                    <p><strong>Họ và Tên:</strong> ${customerName}</p>
                    <p><strong>Số điện thoại:</strong> 0${customerPhone}</p>
                    <p><strong>Email:</strong> ${customerEmail}</p>
                `;
            } catch (err) {
                output.innerHTML = `<p>${err}</p>`;
            }
        })
        .catch(err => {
            console.error('Lỗi truy vấn:', err);
            output.innerHTML = '<p>Đã xảy ra lỗi khi lấy dữ liệu.</p>';
        });
}

// Bắt sự kiện bấm nút Tìm kiếm
const searchBtn = document.getElementById('searchButton');
if (searchBtn) {
    searchBtn.addEventListener('click', function () {
        const searchInput = document.getElementById('searchInput');
        const code = searchInput ? searchInput.value.trim() : '';
        if (!code) return;
        fetchData(code);
    });
}

// Chống mở chuột phải
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
