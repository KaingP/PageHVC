/**
 * ==============================================================================
 * stage-dissolve.js - Multi-Stage Pixel Dissolve (Bottom-to-Top Arcade Scroll)
 * ==============================================================================
 * Quản lý:
 * 1. Hiệu ứng chuyển cảnh Pixel Dissolve từ dưới lên trên (Bottom-to-Top) tại các vị trí:
 *    - Giữa 3 hàng ảnh (GAME ON) và LINE UP
 *    - Cuối LINE UP và MAP
 *    - Cuối MAP và E-TICKET
 *    - Cuối E-TICKET và HUNGVUONGCONCERT
 * 2. Đồng bộ thanh HP Progress Bar trên Header Nav theo bảng màu thương hiệu.
 * 3. Cập nhật HUD STAGE cố định ở góc dưới bên trái màn hình:
 *    1. GAME ON
 *    2. LINE UP
 *    3. MAP
 *    4. HUNGVUONGCONCERT
 */

(function () {
  'use strict';

  // Bảng màu thương hiệu chính thức
  const BRAND_PIXEL_PALETTE = [
    '#D20001', // Cherry Red
    '#0212EE', // Cobalt Blue
    '#FFA62B', // Citrus Zest
    '#116B09', // Green House
    '#FFFFFF', // Bright White
    '#081910', // Black Bean
    '#D20001', // Cherry Red accent
    '#FFA62B', // Citrus Zest accent
    '#0212EE', // Cobalt accent
  ];

  // Ký tự 8-bit Arcade & Gaming
  const RETRO_PIXEL_CHARS = [
    '█', '▓', '▒', '░', '■', '▲', '▼', '◆', '●', '✦', '★', '✚',
    '0', '1', 'H', 'V', 'C', 'G', 'O', '👾', '🎮', '🕹️', '#', '+'
  ];

  // Cấu hình kích thước và dải phân tán pixel
  const config = {
    cellSize: 26,       // Kích thước ô pixel
    spreadAbove: 0.22,  // Biên độ dải trên
    spreadBelow: 0.22,  // Biên độ dải dưới
    scatter: 0.16       // Mức độ phân tán ngẫu nhiên
  };

  // Chiều dài dải di chuyển
  const totalRange = 1 + config.spreadAbove + config.spreadBelow;

  // Hàm băm giả lập số ngẫu nhiên cố định theo tọa độ
  function hash(r, c, seed = 0) {
    const val = Math.sin(r * 12.9898 + c * 78.233 + seed * 43758.5453) * 43758.5453;
    return val - Math.floor(val);
  }

  /**
   * Khởi tạo hiệu ứng Pixel Dissolve cho một Transition Zone cụ thể
   */
  function setupTransitionZone(zoneEl) {
    const visual = zoneEl.querySelector('.transition-visual');
    const gridEl = zoneEl.querySelector('.transition-dissolve-grid');
    if (!visual || !gridEl) return;

    let cellDataArray = [];
    let cellDOMArray = [];

    function buildGrid() {
      gridEl.innerHTML = '';
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

          const colorIndex = Math.floor(hash(r, c, 3) * BRAND_PIXEL_PALETTE.length);
          const cellColor = BRAND_PIXEL_PALETTE[colorIndex];
          cell.style.backgroundColor = cellColor;

          const charIndex = Math.floor(hash(r, c, 4) * RETRO_PIXEL_CHARS.length);
          cell.textContent = RETRO_PIXEL_CHARS[charIndex];

          cell.style.color = (cellColor === '#FFFFFF' || cellColor === '#FFA62B') ? '#081910' : '#FFFFFF';

          gridEl.appendChild(cell);

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

    function hideAllCells() {
      cellDOMArray.forEach(cell => {
        cell.style.visibility = 'hidden';
      });
    }

    // Cập nhật dải pixel từ dưới lên trên
    function updateDissolve(progress) {
      // Tâm dải di chuyển: Từ ĐÁY (1 + spreadBelow) lên ĐỈNH (-spreadAbove)
      const bandCenterY = (1 + config.spreadBelow) - progress * totalRange;

      // Cắt ảnh từ dưới lên: bottomPercentage giảm từ 100% về 0%
      const clipProgress = Math.min(Math.max((progress * totalRange - config.spreadBelow) / 1, 0), 1);
      const bottomPercentage = (1 - clipProgress) * 100;
      visual.style.clipPath = `polygon(0 0, 100% 0, 100% ${bottomPercentage}%, 0 ${bottomPercentage}%)`;

      if (progress <= 0 || progress >= 1) {
        hideAllCells();
        return;
      }

      const sparkleColors = ['#D20001', '#0212EE', '#FFA62B', '#116B09', '#FFFFFF'];

      cellDataArray.forEach((cellData, i) => {
        const cellDom = cellDOMArray[i];
        const rawDist = cellData.normalizedY - bandCenterY;

        const distFromCenter = Math.abs(rawDist);
        const scatterFactor = Math.min(distFromCenter / config.spreadAbove, 1);
        const effectiveY = cellData.normalizedY + cellData.scatterOffset * scatterFactor;
        const dist = effectiveY - bandCenterY;

        if (dist < -config.spreadAbove || dist > config.spreadBelow) {
          cellDom.style.visibility = 'hidden';
          return;
        }

        const normDist = dist < 0 ? Math.abs(dist) / config.spreadAbove : dist / config.spreadBelow;
        const density = Math.pow(1 - normDist, 1.8);

        if (density > cellData.threshold) {
          cellDom.style.visibility = 'visible';

          const colorIdx = (cellData.row * 3 + cellData.col * 7 + Math.floor(progress * 30)) % sparkleColors.length;
          const chosenColor = sparkleColors[colorIdx];

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

    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.create({
        trigger: zoneEl,
        start: 'top top',
        end: () => `+=${window.innerHeight * 0.9}`,
        pin: true,
        pinSpacing: true,
        scrub: 0.5,
        onUpdate: (self) => {
          updateDissolve(self.progress);
        }
      });
    }

    window.addEventListener('resize', () => {
      buildGrid();
    });
  }

  /**
   * Khởi tạo quản lý STAGE HUD ở góc dưới bên trái và HP Bar ở Header Nav
   */
  function setupStageHudAndHp() {
    const hudStageText = document.getElementById('hud-active-stage-text');
    const stageBtns = document.querySelectorAll('.stage-step-btn');
    const progressBarFill = document.getElementById('scroll-progress-fill');

    const STAGES = [
      { id: 1, key: 'GAME ON', name: 'GAME ON', selector: '#stage-gameon' },
      { id: 2, key: 'LINE UP', name: 'LINE UP', selector: '#stage-lineup' },
      { id: 3, key: 'MAP', name: 'MAP', selector: '#stage-map' },
      { id: 4, key: 'HUNGVUONGCONCERT', name: 'HUNGVUONGCONCERT', selector: '#stage-eticket' },
    ];

    let currentActiveStageId = 1;

    function setActiveStage(stageId) {
      if (currentActiveStageId === stageId) return;
      currentActiveStageId = stageId;

      const stageInfo = STAGES.find(s => s.id === stageId) || STAGES[0];

      if (hudStageText) {
        hudStageText.innerHTML = `
          <span class="stage-prefix">STAGE 0${stageInfo.id} //</span>
          <span class="stage-title">${stageInfo.name}</span>
        `;
        hudStageText.classList.remove('glitch-active');
        void hudStageText.offsetWidth; // Trigger reflow
        hudStageText.classList.add('glitch-active');
      }

      stageBtns.forEach(btn => {
        const btnStage = parseInt(btn.getAttribute('data-stage'), 10);
        if (btnStage === stageId) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    // Xử lý sự kiện click trên các nút Stage để cuộn mượt đến mục đó
    stageBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetSel = btn.getAttribute('data-target');
        const targetEl = document.querySelector(targetSel);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // Đồng bộ theo dõi vị trí cuộn trang để cập nhật STAGE và HP Bar
    function updateOnScroll() {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;

      // Cập nhật thanh HP
      if (progressBarFill && docHeight > 0) {
        const percent = Math.min(Math.max((scrollY / docHeight) * 100, 0), 100);
        progressBarFill.style.width = `${Math.round(percent)}%`;
      }

      // Xác định Stage hiện tại dựa trên tọa độ viewport
      const viewportMid = scrollY + window.innerHeight * 0.45;

      const elGameon = document.getElementById('stage-gameon');
      const elLineup = document.getElementById('stage-lineup');
      const elMap = document.getElementById('stage-map');
      const elEticket = document.getElementById('stage-eticket');
      const elHvc = document.getElementById('stage-hungvuongconcert');

      if (elHvc && elHvc.getBoundingClientRect().top + scrollY <= viewportMid) {
        setActiveStage(4);
      } else if (elEticket && elEticket.getBoundingClientRect().top + scrollY <= viewportMid) {
        setActiveStage(4);
      } else if (elMap && elMap.getBoundingClientRect().top + scrollY <= viewportMid) {
        setActiveStage(3);
      } else if (elLineup && elLineup.getBoundingClientRect().top + scrollY <= viewportMid) {
        setActiveStage(2);
      } else {
        setActiveStage(1);
      }
    }

    window.addEventListener('scroll', updateOnScroll, { passive: true });
    updateOnScroll(); // Gọi ngay lần đầu
  }

  function init() {
    const zones = document.querySelectorAll('.pixel-transition-zone');
    zones.forEach(zone => setupTransitionZone(zone));
    setupStageHudAndHp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
