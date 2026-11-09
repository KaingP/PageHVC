/**
 * ==============================================================================
 * stage-dissolve.js - Retro Pixel Dissolve Reveal (Bottom-to-Top Arcade Scroll)
 * ==============================================================================
 * Hiệu ứng chuyển cảnh pixel nghệ thuật lấy cảm hứng từ DEMO1:
 * - Chuyển cảnh giữa các màn (STAGE 01 -> 05).
 * - Chiều di chuyển: TỪ DƯỚI LÊN TRÊN (Bottom to Top) theo yêu cầu.
 * - Bảng màu: Brand Palette chuẩn (Cherry Red, Cobalt Blue, Citrus Zest, Green House, Bright White, Black Bean).
 * - Cập nhật thanh HP & HUD 8-bit thời gian thực theo tiến trình cuộn.
 */

(function () {
  'use strict';

  // 1. Bảng màu thương hiệu chính thức
  const BRAND_PIXEL_PALETTE = [
    '#D20001', // Cherry Red
    '#0212EE', // Cobalt Blue
    '#FFA62B', // Citrus Zest
    '#116B09', // Green House
    '#FFFFFF', // Bright White
    '#081910', // Black Bean
    '#D20001', // Cherry Red (accent)
    '#FFA62B', // Citrus Zest (accent)
    '#0212EE', // Cobalt (accent)
  ];

  // Ký tự phong cách 8-bit arcade, icon game và chữ ký hiệu
  const RETRO_PIXEL_CHARS = [
    '█', '▓', '▒', '░', '■', '▲', '▼', '◆', '●', '✦', '★', '✚',
    '0', '1', 'H', 'V', 'C', 'G', 'O', '👾', '🎮', '🕹️', '#', '+'
  ];

  // Cấu hình dải phân tán pixel
  const config = {
    cellSize: 24,       // Kích thước ô pixel sắc nét
    spreadAbove: 0.22,  // Biên độ dải dissolve phía trên
    spreadBelow: 0.22,  // Biên độ dải dissolve phía dưới
    scatter: 0.16       // Mức độ phân tán ngẫu nhiên
  };

  // Hàm băm giả lập số ngẫu nhiên cố định theo tọa độ (Deterministic Hash)
  function hash(r, c, seed = 0) {
    const val = Math.sin(r * 12.9898 + c * 78.233 + seed * 43758.5453) * 43758.5453;
    return val - Math.floor(val);
  }

  function initStageDissolve() {
    const spotlightSection = document.getElementById('stage-spotlight');
    if (!spotlightSection) return;

    const spotlightImages = spotlightSection.querySelectorAll('.spotlight-image');
    const dissolveGrid = spotlightSection.querySelector('.dissolve-grid');
    const hudScore = document.getElementById('hud-score');
    const hudLevel = document.getElementById('hud-level');
    const hudStatus = document.getElementById('hud-status');
    const progressBarFill = document.getElementById('scroll-progress-fill');

    if (spotlightImages.length === 0 || !dissolveGrid) return;

    const totalImages = spotlightImages.length;
    const totalTransitions = totalImages - 1;

    // Thiết lập thứ tự z-index: ảnh đầu tiên nằm trên cùng
    spotlightImages.forEach((img, index) => {
      img.style.zIndex = totalImages - index;
    });

    let cellDataArray = [];
    let cellDOMArray = [];

    // Xây dựng ma trận lưới các ô pixel
    function buildGrid() {
      dissolveGrid.innerHTML = '';
      cellDataArray = [];
      cellDOMArray = [];

      const cols = Math.ceil(window.innerWidth / config.cellSize);
      const rows = Math.ceil(window.innerHeight / config.cellSize);
      const fontSize = Math.max(11, Math.floor(config.cellSize * 0.68));

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = document.createElement('div');
          cell.className = 'dissolve-cell';
          cell.style.width = `${config.cellSize}px`;
          cell.style.height = `${config.cellSize}px`;
          cell.style.left = `${c * config.cellSize}px`;
          cell.style.top = `${r * config.cellSize}px`;
          cell.style.fontSize = `${fontSize}px`;

          // Chọn màu thương hiệu ngẫu nhiên
          const colorIndex = Math.floor(hash(r, c, 3) * BRAND_PIXEL_PALETTE.length);
          const cellColor = BRAND_PIXEL_PALETTE[colorIndex];
          cell.style.backgroundColor = cellColor;

          // Chọn ký tự 8-bit ngẫu nhiên
          const charIndex = Math.floor(hash(r, c, 4) * RETRO_PIXEL_CHARS.length);
          cell.textContent = RETRO_PIXEL_CHARS[charIndex];

          // Màu chữ tương phản
          cell.style.color = (cellColor === '#FFFFFF' || cellColor === '#FFA62B') ? '#081910' : '#FFFFFF';

          dissolveGrid.appendChild(cell);

          // Tọa độ Y chuẩn hóa (0 -> 1 từ đỉnh xuống đáy)
          const normalizedY = (r * config.cellSize + config.cellSize / 2) / window.innerHeight;
          const threshold = hash(r, c, 1);
          const scatterOffset = (hash(r, c, 2) - 0.5) * config.scatter;

          cellDataArray.push({
            normalizedY,
            threshold,
            scatterOffset,
            baseColor: cellColor,
            row: r,
            col: c
          });
          cellDOMArray.push(cell);
        }
      }
    }

    buildGrid();

    // Chiều dài di chuyển của dải dissolve
    const totalRange = 1 + config.spreadAbove + config.spreadBelow;

    /**
     * Cập nhật clip-path ảnh: HIỆU ỨNG TỪ DƯỚI LÊN TRÊN (Bottom-to-Top)
     * - Khi localProgress = 0: Ảnh đầy đủ 100% height
     * - Khi localProgress tăng: Đáy ảnh bị cắt cuộn dần lên đỉnh (100% -> 0%)
     */
    function updateClipPathsBottomToTop(transitionIndex, localProgress) {
      spotlightImages.forEach((img, i) => {
        if (i < transitionIndex) {
          // Các ảnh trước đã bị tan biến hoàn toàn lên trên
          img.style.clipPath = 'polygon(0 0, 100% 0, 100% 0, 0 0)';
        } else if (i === transitionIndex) {
          // Ảnh hiện tại đang tan biến từ đáy lên đỉnh
          const clipProgress = Math.min(Math.max((localProgress * totalRange - config.spreadBelow) / 1, 0), 1);
          const bottomPercentage = (1 - clipProgress) * 100;
          img.style.clipPath = `polygon(0 0, 100% 0, 100% ${bottomPercentage}%, 0 ${bottomPercentage}%)`;
        } else {
          // Các ảnh sau nằm bên dưới chờ hiển thị
          img.style.clipPath = 'polygon(0 0, 100% 0, 100% 100%, 0 100%)';
        }
      });
    }

    /**
     * Cập nhật dải ô pixel dissolve: DI CHUYỂN TỪ DƯỚI LÊN TRÊN
     * - bandCenterY bắt đầu từ dưới (Y > 1) và di chuyển lên đỉnh (Y < 0)
     */
    function updateDissolveGridBottomToTop(bandCenterY, localProgress) {
      const brandSparkleColors = ['#D20001', '#0212EE', '#FFA62B', '#116B09', '#FFFFFF'];

      cellDataArray.forEach((cellData, i) => {
        const cellDom = cellDOMArray[i];
        const rawDist = cellData.normalizedY - bandCenterY;

        const distFromCenter = Math.abs(rawDist);
        const scatterFactor = Math.min(distFromCenter / config.spreadAbove, 1);
        const effectiveY = cellData.normalizedY + cellData.scatterOffset * scatterFactor;

        const dist = effectiveY - bandCenterY;

        // Nếu nằm ngoài vùng dải dissolve -> ẩn
        if (dist < -config.spreadAbove || dist > config.spreadBelow) {
          cellDom.style.visibility = 'hidden';
          return;
        }

        const normDist = dist < 0 ? Math.abs(dist) / config.spreadAbove : dist / config.spreadBelow;
        const density = Math.pow(1 - normDist, 1.8);

        if (density > cellData.threshold) {
          cellDom.style.visibility = 'visible';

          // Hiệu ứng chớp màu pixel theo bảng màu thương hiệu
          const colorIdx = (cellData.row * 3 + cellData.col * 7 + Math.floor(localProgress * 25)) % brandSparkleColors.length;
          const chosenColor = brandSparkleColors[colorIdx];

          if (cellData.threshold > 0.45) {
            cellDom.style.backgroundColor = chosenColor;
            cellDom.style.boxShadow = `0 0 10px ${chosenColor}`;
          } else {
            cellDom.style.backgroundColor = cellData.baseColor;
            cellDom.style.boxShadow = 'none';
          }
        } else {
          cellDom.style.visibility = 'hidden';
        }
      });
    }

    function hideAllCells() {
      cellDOMArray.forEach(cell => {
        cell.style.visibility = 'hidden';
      });
    }

    // Đăng ký ScrollTrigger ghim cố định và điều khiển cuộn
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.create({
        trigger: spotlightSection,
        start: 'top top',
        end: () => `+=${totalTransitions * window.innerHeight * 1.3}`,
        pin: true,
        pinSpacing: true,
        scrub: 0.6,
        onUpdate: (self) => {
          const progress = self.progress;

          // Cập nhật thanh HP
          if (progressBarFill) {
            progressBarFill.style.width = `${Math.round(progress * 100)}%`;
          }

          // Cập nhật điểm số 1UP
          if (hudScore) {
            const score = Math.floor(progress * 99999);
            hudScore.textContent = score.toString().padStart(5, '0');
          }

          const rawIndex = progress * totalTransitions;
          let transitionIndex = Math.floor(rawIndex);
          if (transitionIndex >= totalTransitions) transitionIndex = totalTransitions - 1;

          // Cập nhật số Stage hiện tại
          if (hudLevel) {
            hudLevel.textContent = `0${transitionIndex + 1}`;
          }

          const localProgress = rawIndex - transitionIndex;

          // Tâm dải dissolve: DI CHUYỂN TỪ ĐÁY (1 + spreadBelow) LÊN ĐỈNH (-spreadAbove)
          const bandCenterY = (1 + config.spreadBelow) - localProgress * totalRange;

          if (progress <= 0 || progress >= 1 || localProgress <= 0 || localProgress >= 1) {
            hideAllCells();
            updateClipPathsBottomToTop(transitionIndex, localProgress);
            if (hudStatus) hudStatus.textContent = progress >= 1 ? 'CLEAR' : 'STANDBY';
          } else {
            updateClipPathsBottomToTop(transitionIndex, localProgress);
            updateDissolveGridBottomToTop(bandCenterY, localProgress);
            if (hudStatus) hudStatus.textContent = 'DISSOLVE';
          }
        }
      });
    }

    // Xử lý khi resize cửa sổ
    window.addEventListener('resize', () => {
      buildGrid();
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
    });

    // Cập nhật tiến trình thanh HP khi cuộn ở các phần khác ngoài Spotlight
    window.addEventListener('scroll', () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 0 && progressBarFill) {
        // Chỉ ghi đè khi không nằm trong spotlight
        const rect = spotlightSection.getBoundingClientRect();
        if (rect.top > 0 || rect.bottom < 0) {
          const overallPercent = Math.min(Math.max((window.scrollY / maxScroll) * 100, 0), 100);
          progressBarFill.style.width = `${Math.round(overallPercent)}%`;
        }
      }
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStageDissolve);
  } else {
    initStageDissolve();
  }
})();
