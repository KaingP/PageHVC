/**
 * ==============================================================================
 * js/animation.js - Quản lý render album ảnh và hiệu ứng cuộn trang (ScrollTrigger & Lenis)
 * ==============================================================================
 * Chức năng:
 * 1. Khởi tạo plugin GSAP ScrollTrigger và thư viện cuộn mượt Lenis Scroll.
 * 2. Đọc dữ liệu từ data.js (dataCol1, dataCol2, dataCol3) và render động ra 3 cột ảnh (.projects_col).
 * 3. Tính toán độ chênh lệch chiều cao giữa các cột trên Desktop để tạo hiệu ứng thị giác (Parallax effect)
 *    khi người dùng cuộn chuột qua mục .projects.
 */

// Đăng ký plugin ScrollTrigger với GSAP nếu thư viện đã sẵn sàng
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

// Các bộ chọn phần tử DOM chính của khu vực Projects
const projectsSelector = {
    element: document.querySelector('.projects'),
    wrapper: document.querySelector('.projects_wrapper'),
    outro: document.querySelector('.projects_outro'),
};

// Kiểm tra xem người dùng có đang ở thiết bị di động (chiều rộng màn hình <= 768px) hay không
const isMobile = window.matchMedia('(max-width:768px)').matches;

/**
 * Hàm tạo và render động các cột ảnh từ dữ liệu trong data.js
 */
const createContents = () => {
    if (!projectsSelector.wrapper) return;
    if (typeof dataCol1 === 'undefined' || typeof dataCol2 === 'undefined' || typeof dataCol3 === 'undefined') {
        console.warn('Dữ liệu các cột (dataCol1, dataCol2, dataCol3) chưa được nạp.');
        return;
    }

    // Tập hợp dữ liệu của 3 cột ảnh
    const datasets = [dataCol1, dataCol2, dataCol3];

    datasets.forEach((data) => {
        // Tạo khối div cho từng cột
        const projectCol = document.createElement('div');
        projectCol.classList.add('projects_col');
        projectsSelector.wrapper.appendChild(projectCol);

        // Duyệt qua từng item (ảnh hoặc video) trong cột
        data.forEach((item) => {
            const projectsItem = document.createElement('div');
            projectsItem.classList.add('projects_col_item');
            projectsItem.style.background = item.backgroundColor;

            let mediaContent = '';
            if (item.type === 'video' && item.video) {
                // Render thẻ video nếu item là video
                mediaContent = `
                    <div class="projects_col_item_media">
                        <video src="${item.video}" autoplay muted loop playsinline></video>
                    </div>
                `;
            } else if (item.type === 'image' && item.img) {
                // Render thẻ img nếu item là ảnh
                mediaContent = `
                    <div class="projects_col_item_media">
                        <img src="${item.img}" alt="" />
                    </div>
                `;
            }

            projectsItem.innerHTML = mediaContent;
            projectCol.appendChild(projectsItem);
        });
    });

    // Nếu không phải điện thoại, tính toán khoảng trống lệch cột để tạo hiệu ứng cuộn
    if (!isMobile) calcFilledSpace();
};

/**
 * Khởi tạo hiệu ứng cuộn trang mượt mà bằng Lenis Scroll
 */
const initLenis = () => {
    if (typeof Lenis === 'undefined') return;
    const lenis = new Lenis({
        lerp: 0.064,        // Độ trễ trượt mượt (smoothness)
        smoothWheel: true,  // Bật mượt khi cuộn chuột
    });

    // Đồng bộ vị trí cuộn của Lenis với ScrollTrigger
    if (typeof ScrollTrigger !== 'undefined') {
        lenis.on('scroll', ScrollTrigger.update);
    }
    if (typeof gsap !== 'undefined') {
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
    }
};

/**
 * Tính toán độ chênh chiều cao giữa các cột ảnh để chuẩn bị hiệu ứng di chuyển Parallax
 */
const calcFilledSpace = () => {
    const projectCols = document.querySelectorAll('.projects_col');

    if (projectCols.length < 3) {
        console.warn('Không đủ 3 cột ảnh để tính toán khoảng cách.');
        return;
    }

    const projectColSecond = projectCols[1].getBoundingClientRect().height;
    const projectColThird = projectCols[2].getBoundingClientRect().height;

    // Khoảng cách chênh lệch giữa cột 2 và cột 3
    const difference = projectColThird - projectColSecond;

    if (!isMobile) animateMedia(projectCols, difference);
};

/**
 * Tạo hiệu ứng GSAP ScrollTrigger di chuyển cột thứ 2 theo thanh cuộn
 */
const animateMedia = (projectCols, difference) => {
    if (typeof gsap === 'undefined' || !projectsSelector.element) return;
    gsap.set(projectCols[1], { y: 0 });

    gsap.timeline({
        scrollTrigger: {
            trigger: projectsSelector.element,
            start: 'top top',
            end: () => `${projectsSelector.element.offsetHeight}px bottom`,
            scrub: true, // Cuộn đến đâu hiệu ứng chạy mượt theo đến đó
        },
    }).to(projectCols[1], {
        duration: 2,
        y: difference,
        ease: 'none',
    });
};

/**
 * Điểm khởi chạy chính khi trang tải xong
 */
const init = () => {
    createContents();
    if (!isMobile) initLenis();
};

// Đảm bảo chạy đúng thời điểm DOM đã tải
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
