/**
 * ==============================================================================
 * js/talent.js - Hiệu ứng tương tác danh sách nghệ sĩ (Talent Showcase)
 * ==============================================================================
 * Chức năng:
 * 1. Mặc định thẻ nghệ sĩ đầu tiên sẽ được mở rộng (hovered).
 * 2. Khi người dùng rê chuột (mouseenter) vào một thẻ nghệ sĩ bất kỳ:
 *    - Thẻ được chọn sẽ mở rộng kích thước flex: '1 1 100rem'
 *    - Các thẻ khác co nhỏ lại về kích thước flex: '0 1 20rem'
 * 3. Cập nhật vị trí con trỏ/thước đo (.indicator) theo tọa độ chuột di chuyển ngang.
 */

const galleryContainer = document.querySelector(".gallery");
if (galleryContainer) {
    const galleryItems = galleryContainer.querySelectorAll(".gallery-item");
    const indicator = document.querySelector(".indicator");

    // Kích thước co/dãn của các thẻ nghệ sĩ
    const defaultItemFlex = "0 1 20rem"; // Trạng thái thu gọn
    const hoverItemFlex = "1 1 100rem";  // Trạng thái mở rộng khi chọn

    /**
     * Cập nhật lại thuộc tính flex cho toàn bộ thẻ trong danh sách
     */
    const updateGalleryItems = () => {
        galleryItems.forEach((item) => {
            let flex = defaultItemFlex;
            if (item.isHovered) {
                flex = hoverItemFlex;
            }
            item.style.flex = flex;
        });
    };

    if (galleryItems.length > 0) {
        // Mặc định khởi tạo thẻ đầu tiên ở trạng thái mở rộng
        galleryItems[0].isHovered = true;
        updateGalleryItems();

        // Gán sự kiện rê chuột (hover) cho từng thẻ nghệ sĩ
        galleryItems.forEach((item) => {
            item.addEventListener("mouseenter", () => {
                galleryItems.forEach((otherItem) => {
                    otherItem.isHovered = otherItem === item;
                });
                updateGalleryItems();
            });
        });
    }

    // Cập nhật vị trí thanh chỉ thị (.indicator) theo vị trí chuột di chuyển
    if (indicator) {
        galleryContainer.addEventListener("mousemove", (e) => {
            const rect = galleryContainer.getBoundingClientRect();
            indicator.style.left = `${e.clientX - rect.left}px`;
        });
    }
}
