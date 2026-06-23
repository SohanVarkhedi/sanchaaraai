/* =====================================================
   SANCHAARA AI · Landing Page JS Controller
   Tactical Traffic simulation + GSAP Scroll-Driven Engine
===================================================== */
'use strict';

// Register GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

/* ── LENIS SMOOTH SCROLL ──────────────────────── */
const lenis = new Lenis({
  duration: 1.2,
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);

/* ── DIAGNOSTICS LOGGING ──────────────────────── */
function logStatus(msg) {
  console.log('[Sanchaara] ' + msg);
}

function logError(msg) {
  console.error('[Sanchaara Error] ' + msg);
}

/* ═════════════════════════════════════════════════
   1. PROCEDURAL TRAFFIC BACKGROUND
   ═════════════════════════════════════════════════ */
const bgCanvas = document.getElementById('traffic-bg');
if (bgCanvas) {
  const ctx = bgCanvas.getContext('2d');
  let w = bgCanvas.width = window.innerWidth;
  let h = bgCanvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    w = bgCanvas.width = window.innerWidth;
    h = bgCanvas.height = window.innerHeight;
    initCity();
    initPaths();
  }, { passive: true });

  let buildings = [];
  let paths = [];
  let cars = [];
  
  const spacing = 115;
  let cx = w / 2;
  let cy = h / 2 - 100;

  // Project 3D grid coordinate to 2D isometric screen coordinate
  function toIso(x, y, z = 0) {
    const isoX = cx + (x - y) * Math.cos(Math.PI / 6);
    const isoY = cy + (x + y) * Math.sin(Math.PI / 6) - z;
    return { x: isoX, y: isoY };
  }

  function initCity() {
    cx = w / 2;
    cy = h / 2 - 100;
    buildings = [];
    
    // Spawn building boxes on odd coordinates, leaving even paths as streets
    for (let i = -7; i <= 7; i++) {
      for (let j = -7; j <= 7; j++) {
        const isRoadX = (i % 2 === 0);
        const isRoadY = (j % 2 === 0);
        
        if (!isRoadX && !isRoadY) {
          const gridX = i * spacing;
          const gridY = j * spacing;
          const dist = Math.sqrt(i*i + j*j);
          
          // Let's determine type procedurally
          let type = 'residential';
          let wX = 68;
          let wY = 68;
          let hVal = 60 + Math.random() * 40;
          
          const val = Math.abs(i * j + i + j);
          if (val % 5 === 0) {
            type = 'park';
            wX = 80;
            wY = 80;
            hVal = 3;
          } else if (val % 3 === 0 && dist < 5.5) {
            type = 'tower';
            wX = 54;
            wY = 54;
            hVal = Math.max(140, 240 - dist * 22) + Math.random() * 40;
          } else if (val % 2 === 0) {
            type = 'stepped';
            wX = 72;
            wY = 72;
            hVal = 55 + Math.random() * 25; // base height
          } else {
            type = 'residential';
            wX = 66 + Math.random() * 12;
            wY = 66 + Math.random() * 12;
            hVal = 70 + Math.random() * 30;
          }
          
          // Create static window states so they don't flicker
          const winCols = type === 'tower' ? 4 : (type === 'residential' ? 5 : 4);
          const winRows = type === 'tower' ? 9 : (type === 'residential' ? 5 : 4);
          const windowStatesLeft = [];
          const windowStatesRight = [];
          for (let r = 0; r < winRows; r++) {
            windowStatesLeft.push([]);
            windowStatesRight.push([]);
            for (let c = 0; c < winCols; c++) {
              const prob = type === 'tower' ? 0.45 : 0.35;
              windowStatesLeft[r].push(Math.random() < prob);
              windowStatesRight[r].push(Math.random() < prob);
            }
          }

          // Stepped buildings top step dimensions
          let steppedTop = null;
          if (type === 'stepped') {
            steppedTop = {
              wX: wX - 22,
              wY: wY - 22,
              h: hVal + 40 + Math.random() * 30, // top step height
              winCols: 3,
              winRows: 4,
              windowStatesLeft: [],
              windowStatesRight: []
            };
            for (let r = 0; r < steppedTop.winRows; r++) {
              steppedTop.windowStatesLeft.push([]);
              steppedTop.windowStatesRight.push([]);
              for (let c = 0; c < steppedTop.winCols; c++) {
                steppedTop.windowStatesLeft[r].push(Math.random() < 0.4);
                steppedTop.windowStatesRight[r].push(Math.random() < 0.4);
              }
            }
          }

          // Rooftop decoration flags
          const hasAntenna = (type === 'tower' && Math.random() < 0.65) || (type === 'stepped' && Math.random() < 0.3);
          const hasHelipad = (type === 'residential' && Math.random() < 0.3) || (type === 'tower' && !hasAntenna && Math.random() < 0.5);
          const hasHVAC = !hasHelipad && type !== 'park' && Math.random() < 0.7;

          buildings.push({
            x: gridX,
            y: gridY,
            type: type,
            wX: wX,
            wY: wY,
            h: hVal,
            depth: gridX + gridY,
            winCols: winCols,
            winRows: winRows,
            windowStatesLeft: windowStatesLeft,
            windowStatesRight: windowStatesRight,
            steppedTop: steppedTop,
            hasAntenna: hasAntenna,
            hasHelipad: hasHelipad,
            hasHVAC: hasHVAC,
            antennaPulseOffset: Math.random() * 100
          });
        }
      }
    }
    // Sort buildings back-to-front (smaller depth = further back)
    buildings.sort((a, b) => a.depth - b.depth);
  }

  function initPaths() {
    paths = [];
    const limit = 7.5 * spacing;
    
    // Columns (even i)
    for (let i = -8; i <= 8; i += 2) {
      paths.push({ x1: i * spacing, y1: -limit, x2: i * spacing, y2: limit });
      paths.push({ x1: i * spacing, y1: limit, x2: i * spacing, y2: -limit });
    }
    // Rows (even j)
    for (let j = -8; j <= 8; j += 2) {
      paths.push({ x1: -limit, y1: j * spacing, x2: limit, y2: j * spacing });
      paths.push({ x1: limit, y1: j * spacing, x2: -limit, y2: j * spacing });
    }
  }

  function spawnCars() {
    cars = [];
    const colors = ['#a0aab8', '#404652', '#b24343', '#3b528b', '#d29a28']; // Muted urban colors (silver, charcoal, crimson, navy, taxi amber)
    // Spawn 70 vehicles
    for (let i = 0; i < 70; i++) {
      const pathIdx = Math.floor(Math.random() * paths.length);
      const r = Math.random();
      let type = 'car';
      let speed = 0.0015;
      let tailLength = 0.06;
      let color = colors[Math.floor(Math.random() * colors.length)];
      let size = 2;
      let L = 14;
      let W = 6.2;
      let H = 5.2;

      if (r < 0.25) {
        type = 'bike';
        speed = 0.0024 + Math.random() * 0.0012;
        color = '#3b4352'; // motorcycle chassis grey
        L = 6.5;
        W = 2.4;
        H = 2.4;
      } else if (r < 0.4) {
        type = 'bus';
        speed = 0.0007 + Math.random() * 0.0005;
        color = '#324a75'; // soft transit blue
        L = 27;
        W = 7.5;
        H = 9.0;
      } else {
        // car
        speed = 0.0012 + Math.random() * 0.0010;
        color = colors[Math.floor(Math.random() * colors.length)];
        L = 14;
        W = 6.2;
        H = 5.2;
      }

      cars.push({
        type: type,
        pathIndex: pathIdx,
        progress: Math.random(),
        speed: speed,
        color: color,
        size: size,
        tailLength: tailLength,
        L: L,
        W: W,
        H: H
      });
    }
  }

  initCity();
  initPaths();
  spawnCars();

  function drawBuildingBlock(b) {
    const x = b.x - b.wX / 2;
    const y = b.y - b.wY / 2;
    const h = b.h;

    if (b.type === 'park') {
      const t0 = toIso(x, y, h);
      const t1 = toIso(x + b.wX, y, h);
      const t2 = toIso(x + b.wX, y + b.wY, h);
      const t3 = toIso(x, y + b.wY, h);

      const b1 = toIso(x + b.wX, y, 0);
      const b2 = toIso(x + b.wX, y + b.wY, 0);
      const b3 = toIso(x, y + b.wY, 0);

      // Sides (thin edge)
      ctx.fillStyle = '#06100c';
      ctx.beginPath();
      ctx.moveTo(b3.x, b3.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.lineTo(t3.x, t3.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#030806';
      ctx.beginPath();
      ctx.moveTo(b1.x, b1.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.lineTo(t1.x, t1.y);
      ctx.closePath();
      ctx.fill();

      // Top grass face
      ctx.fillStyle = '#0d2218';
      ctx.strokeStyle = '#153325';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(t0.x, t0.y);
      ctx.lineTo(t1.x, t1.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.lineTo(t3.x, t3.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw fountain in center
      const cnt = toIso(b.x, b.y, h);
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.4)';
      ctx.fillStyle = 'rgba(0, 255, 204, 0.15)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(cnt.x, cnt.y, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw tiny fountain spray
      ctx.fillStyle = 'rgba(0, 255, 204, 0.8)';
      ctx.beginPath();
      ctx.arc(cnt.x, cnt.y - 2, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Draw 4 trees at the corners
      const treeOffset = 18;
      const treeCoords = [
        { tx: x + treeOffset, ty: y + treeOffset },
        { tx: x + b.wX - treeOffset, ty: y + treeOffset },
        { tx: x + b.wX - treeOffset, ty: y + b.wY - treeOffset },
        { tx: x + treeOffset, ty: y + b.wY - treeOffset }
      ];
      treeCoords.forEach(tc => {
        const trunkBase = toIso(tc.tx, tc.ty, h);
        const trunkTop = toIso(tc.tx, tc.ty, h + 8);
        ctx.strokeStyle = '#433022';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(trunkBase.x, trunkBase.y);
        ctx.lineTo(trunkTop.x, trunkTop.y);
        ctx.stroke();

        ctx.fillStyle = 'rgba(34, 212, 122, 0.6)';
        ctx.beginPath();
        const ptTop = toIso(tc.tx, tc.ty, h + 15);
        const ptL = toIso(tc.tx - 4, tc.ty + 4, h + 8);
        const ptR = toIso(tc.tx + 4, tc.ty - 4, h + 8);
        ctx.moveTo(ptTop.x, ptTop.y);
        ctx.lineTo(ptL.x, ptL.y);
        ctx.lineTo(ptR.x, ptR.y);
        ctx.closePath();
        ctx.fill();
      });

      return;
    }

    function drawBox(x, y, zStart, wX, wY, hTotal, leftColor, rightColor, topColor, strokeColor, bRef, isSteppedTop = false) {
      const zEnd = zStart + hTotal;
      const t0 = toIso(x, y, zEnd);
      const t1 = toIso(x + wX, y, zEnd);
      const t2 = toIso(x + wX, y + wY, zEnd);
      const t3 = toIso(x, y + wY, zEnd);

      const b0 = toIso(x, y, zStart);
      const b1 = toIso(x + wX, y, zStart);
      const b2 = toIso(x + wX, y + wY, zStart);
      const b3 = toIso(x, y + wY, zStart);

      // Draw Front-Left Face
      ctx.fillStyle = leftColor;
      ctx.beginPath();
      ctx.moveTo(b3.x, b3.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.lineTo(t3.x, t3.y);
      ctx.closePath();
      ctx.fill();

      // Draw Front-Right Face
      ctx.fillStyle = rightColor;
      ctx.beginPath();
      ctx.moveTo(b1.x, b1.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.lineTo(t1.x, t1.y);
      ctx.closePath();
      ctx.fill();

      // Draw Top Face
      ctx.fillStyle = topColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(t0.x, t0.y);
      ctx.lineTo(t1.x, t1.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.lineTo(t3.x, t3.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw Window Grids
      const cols = isSteppedTop ? bRef.steppedTop.winCols : bRef.winCols;
      const rows = isSteppedTop ? bRef.steppedTop.winRows : bRef.winRows;
      const winStatesL = isSteppedTop ? bRef.steppedTop.windowStatesLeft : bRef.windowStatesLeft;
      const winStatesR = isSteppedTop ? bRef.steppedTop.windowStatesRight : bRef.windowStatesRight;

      const glowColor = 'rgba(150, 190, 230, 0.35)'; // Soft cool blue-white
      const altGlowColor = 'rgba(230, 180, 110, 0.38)'; // Soft warm amber

      // Left Face Windows
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (winStatesL[r] && winStatesL[r][c]) {
            const u1 = (c + 0.22) / cols;
            const u2 = (c + 0.78) / cols;
            const v1 = (r + 0.22) / rows;
            const v2 = (r + 0.78) / rows;

            const cz1 = zStart + v1 * hTotal;
            const cz2 = zStart + v2 * hTotal;

            const w_b3 = toIso(x + u1 * wX, y + wY, cz1);
            const w_b2 = toIso(x + u2 * wX, y + wY, cz1);
            const w_t2 = toIso(x + u2 * wX, y + wY, cz2);
            const w_t3 = toIso(x + u1 * wX, y + wY, cz2);

            ctx.fillStyle = (r + c) % 3 === 0 ? altGlowColor : glowColor;
            ctx.beginPath();
            ctx.moveTo(w_b3.x, w_b3.y);
            ctx.lineTo(w_b2.x, w_b2.y);
            ctx.lineTo(w_t2.x, w_t2.y);
            ctx.lineTo(w_t3.x, w_t3.y);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      // Right Face Windows
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (winStatesR[r] && winStatesR[r][c]) {
            const u1 = (c + 0.22) / cols;
            const u2 = (c + 0.78) / cols;
            const v1 = (r + 0.22) / rows;
            const v2 = (r + 0.78) / rows;

            const cz1 = zStart + v1 * hTotal;
            const cz2 = zStart + v2 * hTotal;

            const w_b2 = toIso(x + wX, y + wY - u1 * wY, cz1);
            const w_b1 = toIso(x + wX, y + wY - u2 * wY, cz1);
            const w_t1 = toIso(x + wX, y + wY - u2 * wY, cz2);
            const w_t2 = toIso(x + wX, y + wY - u1 * wY, cz2);

            ctx.fillStyle = (r + c) % 3 === 0 ? altGlowColor : glowColor;
            ctx.beginPath();
            ctx.moveTo(w_b2.x, w_b2.y);
            ctx.lineTo(w_b1.x, w_b1.y);
            ctx.lineTo(w_t1.x, w_t1.y);
            ctx.lineTo(w_t2.x, w_t2.y);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }

    const leftColor = '#0f1116';
    const rightColor = '#07090c';
    const topColor = '#1a1d26';
    const strokeColor = '#2b2f3d';

    if (b.type === 'stepped' && b.steppedTop) {
      drawBox(x, y, 0, b.wX, b.wY, h, leftColor, rightColor, topColor, strokeColor, b, false);
      const tx = x + (b.wX - b.steppedTop.wX) / 2;
      const ty = y + (b.wY - b.steppedTop.wY) / 2;
      drawBox(tx, ty, h, b.steppedTop.wX, b.steppedTop.wY, b.steppedTop.h - h, '#14171f', '#090b0f', '#212530', '#343a4a', b, true);
    } else {
      drawBox(x, y, 0, b.wX, b.wY, h, leftColor, rightColor, topColor, strokeColor, b, false);
    }

    // Roof Decorations
    const roofX = b.type === 'stepped' ? x + (b.wX - b.steppedTop.wX) / 2 : x;
    const roofY = b.type === 'stepped' ? y + (b.wY - b.steppedTop.wY) / 2 : y;
    const roofWX = b.type === 'stepped' ? b.steppedTop.wX : b.wX;
    const roofWY = b.type === 'stepped' ? b.steppedTop.wY : b.wY;
    const roofH = b.type === 'stepped' ? b.steppedTop.h : h;

    const roofCenterGridX = roofX + roofWX / 2;
    const roofCenterGridY = roofY + roofWY / 2;

    if (b.hasAntenna) {
      const basePt = toIso(roofCenterGridX, roofCenterGridY, roofH);
      const tipPt = toIso(roofCenterGridX, roofCenterGridY, roofH + 26);
      
      ctx.strokeStyle = '#3d4253';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(basePt.x, basePt.y);
      ctx.lineTo(tipPt.x, tipPt.y);
      ctx.stroke();

      const pulse = Math.floor((Date.now() + b.antennaPulseOffset * 10) / 450) % 2 === 0;
      ctx.fillStyle = pulse ? '#ff3b30' : '#801a1a';
      if (pulse) {
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ff3b30';
      }
      ctx.beginPath();
      ctx.arc(tipPt.x, tipPt.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (b.hasHelipad) {
      const hc = toIso(roofCenterGridX, roofCenterGridY, roofH);
      const radiusX = Math.min(roofWX, roofWY) * 0.35;
      const radiusY = radiusX * 0.5;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(hc.x, hc.y, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.font = '600 7px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('H', hc.x, hc.y);
    }

    if (b.hasHVAC) {
      const hvacSize = 6;
      const hvacX = roofX + 10;
      const hvacY = roofY + 10;
      
      const t0 = toIso(hvacX, hvacY, roofH + hvacSize);
      const t1 = toIso(hvacX + hvacSize, hvacY, roofH + hvacSize);
      const t2 = toIso(hvacX + hvacSize, hvacY + hvacSize, roofH + hvacSize);
      const t3 = toIso(hvacX, hvacY + hvacSize, roofH + hvacSize);

      const b2 = toIso(hvacX + hvacSize, hvacY + hvacSize, roofH);
      const b3 = toIso(hvacX, hvacY + hvacSize, roofH);
      const b1 = toIso(hvacX + hvacSize, hvacY, roofH);

      ctx.fillStyle = '#0f1115';
      ctx.beginPath();
      ctx.moveTo(b3.x, b3.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.lineTo(t3.x, t3.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#080a0d';
      ctx.beginPath();
      ctx.moveTo(b1.x, b1.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.lineTo(t1.x, t1.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#1c1f26';
      ctx.strokeStyle = '#2b303d';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(t0.x, t0.y);
      ctx.lineTo(t1.x, t1.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.lineTo(t3.x, t3.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  function animateTraffic() {
    ctx.fillStyle = '#06080F';
    ctx.fillRect(0, 0, w, h);

    // Draw wide road asphalt strips
    const roadW = 22; // width in grid space
    ctx.fillStyle = '#0c0f1a'; // Subtle, dark asphalt road surface
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.012)'; // Faint border line for road edges
    ctx.lineWidth = 0.8;

    paths.forEach(p => {
      const dx = p.x2 - p.x1;
      const dy = p.y2 - p.y1;
      const dLen = Math.sqrt(dx*dx + dy*dy);
      if (dLen === 0) return;
      const dirX = dx / dLen;
      const dirY = dy / dLen;
      const perpX = -dirY;
      const perpY = dirX;

      const pt0 = toIso(p.x1 - perpX * (roadW / 2), p.y1 - perpY * (roadW / 2));
      const pt1 = toIso(p.x1 + perpX * (roadW / 2), p.y1 + perpY * (roadW / 2));
      const pt2 = toIso(p.x2 + perpX * (roadW / 2), p.y2 + perpY * (roadW / 2));
      const pt3 = toIso(p.x2 - perpX * (roadW / 2), p.y2 - perpY * (roadW / 2));

      ctx.beginPath();
      ctx.moveTo(pt0.x, pt0.y);
      ctx.lineTo(pt1.x, pt1.y);
      ctx.lineTo(pt2.x, pt2.y);
      ctx.lineTo(pt3.x, pt3.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // Draw dashed lane dividers down the center
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.038)'; // Very soft lane dividers
    ctx.lineWidth = 0.8;
    ctx.setLineDash([5, 10]); // Dashed pattern in screen space

    paths.forEach(p => {
      const pt1 = toIso(p.x1, p.y1);
      const pt2 = toIso(p.x2, p.y2);
      ctx.beginPath();
      ctx.moveTo(pt1.x, pt1.y);
      ctx.lineTo(pt2.x, pt2.y);
      ctx.stroke();
    });

    ctx.setLineDash([]); // Reset dashed line state

    const renderList = [];

    buildings.forEach(b => {
      renderList.push({ type: 'building', depth: b.depth, data: b });
    });

    cars.forEach(c => {
      const path = paths[c.pathIndex];
      if (!path) return;

      c.progress += c.speed;
      if (c.progress >= 1) {
        c.progress = 0;
        c.pathIndex = Math.floor(Math.random() * paths.length);
      }

      const cx_v = path.x1 + (path.x2 - path.x1) * c.progress;
      const cy_v = path.y1 + (path.y2 - path.y1) * c.progress;

      renderList.push({
        type: 'car',
        depth: cx_v + cy_v,
        data: c,
        cx: cx_v,
        cy: cy_v
      });
    });

    renderList.sort((a, b) => a.depth - b.depth);

    renderList.forEach(item => {
      if (item.type === 'building') {
        drawBuildingBlock(item.data);
      } else if (item.type === 'car') {
        const c = item.data;
        const path = paths[c.pathIndex];
        if (!path) return;

        const dx = path.x2 - path.x1;
        const dy = path.y2 - path.y1;
        const dLen = Math.sqrt(dx*dx + dy*dy);
        const dirX = dx / dLen;
        const dirY = dy / dLen;

        const perpX = -dirY;
        const perpY = dirX;

        const cx_v = item.cx;
        const cy_v = item.cy;

        const L = c.L;
        const W = c.W;
        const H = c.H;

        // Nested helper inside the loop to render dynamic 3D vehicles
        function drawVehicleBox(cx_val, cy_val, zStart, vL, vW, vH, baseColor, hasWindows = false) {
          const frx = cx_val + dirX * (vL/2) + perpX * (vW/2);
          const fry = cy_val + dirY * (vL/2) + perpY * (vW/2);

          const flx = cx_val + dirX * (vL/2) - perpX * (vW/2);
          const fly = cy_val + dirY * (vL/2) - perpY * (vW/2);

          const brx = cx_val - dirX * (vL/2) + perpX * (vW/2);
          const bry = cy_val - dirY * (vL/2) + perpY * (vW/2);

          const blx = cx_val - dirX * (vL/2) - perpX * (vW/2);
          const bly = cy_val - dirY * (vL/2) - perpY * (vW/2);

          const pFR_bot = toIso(frx, fry, zStart);
          const pFL_bot = toIso(flx, fly, zStart);
          const pBR_bot = toIso(brx, bry, zStart);
          const pBL_bot = toIso(blx, bly, zStart);

          const pFR_top = toIso(frx, fry, zStart + vH);
          const pFL_top = toIso(flx, fly, zStart + vH);
          const pBR_top = toIso(brx, bry, zStart + vH);
          const pBL_top = toIso(blx, bly, zStart + vH);

          // Faces for painters algorithm
          const faces = [
            { name: 'front', pts: [pFL_bot, pFR_bot, pFR_top, pFL_top], depth: (cx_val + dirX * vL/2) + (cy_val + dirY * vL/2), shade: 0.22 },
            { name: 'back',  pts: [pBR_bot, pBL_bot, pBL_top, pBR_top], depth: (cx_val - dirX * vL/2) + (cy_val - dirY * vL/2), shade: 0.45 },
            { name: 'left',  pts: [pBL_bot, pFL_bot, pFL_top, pBL_top], depth: (cx_val - perpX * vW/2) + (cy_val - perpY * vW/2), shade: 0.15 },
            { name: 'right', pts: [pFR_bot, pBR_bot, pBR_top, pFR_top], depth: (cx_val + perpX * vW/2) + (cy_val + perpY * vW/2), shade: 0.32 }
          ];
          faces.sort((a, b) => a.depth - b.depth);

          faces.forEach(f => {
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.moveTo(f.pts[0].x, f.pts[0].y);
            ctx.lineTo(f.pts[1].x, f.pts[1].y);
            ctx.lineTo(f.pts[2].x, f.pts[2].y);
            ctx.lineTo(f.pts[3].x, f.pts[3].y);
            ctx.closePath();
            ctx.fill();

            // Shade
            ctx.fillStyle = `rgba(0, 0, 0, ${f.shade})`;
            ctx.beginPath();
            ctx.moveTo(f.pts[0].x, f.pts[0].y);
            ctx.lineTo(f.pts[1].x, f.pts[1].y);
            ctx.lineTo(f.pts[2].x, f.pts[2].y);
            ctx.lineTo(f.pts[3].x, f.pts[3].y);
            ctx.closePath();
            ctx.fill();

            // Draw window slits on Bus
            if (hasWindows) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
              const numWindows = 4;
              if (f.name === 'left') {
                for (let wIdx = 0; wIdx < numWindows; wIdx++) {
                  const t1 = (wIdx + 0.22) / numWindows;
                  const t2 = (wIdx + 0.78) / numWindows;
                  const zScaleMin = 0.42;
                  const zScaleMax = 0.82;

                  const wx1 = blx + (flx - blx) * t1;
                  const wy1 = bly + (fly - bly) * t1;
                  const wx2 = blx + (flx - blx) * t2;
                  const wy2 = bly + (fly - bly) * t2;

                  const wp1 = toIso(wx1, wy1, zStart + vH * zScaleMin);
                  const wp2 = toIso(wx2, wy2, zStart + vH * zScaleMin);
                  const wp3 = toIso(wx2, wy2, zStart + vH * zScaleMax);
                  const wp4 = toIso(wx1, wy1, zStart + vH * zScaleMax);

                  ctx.beginPath();
                  ctx.moveTo(wp1.x, wp1.y);
                  ctx.lineTo(wp2.x, wp2.y);
                  ctx.lineTo(wp3.x, wp3.y);
                  ctx.lineTo(wp4.x, wp4.y);
                  ctx.closePath();
                  ctx.fill();
                }
              } else if (f.name === 'right') {
                for (let wIdx = 0; wIdx < numWindows; wIdx++) {
                  const t1 = (wIdx + 0.22) / numWindows;
                  const t2 = (wIdx + 0.78) / numWindows;
                  const zScaleMin = 0.42;
                  const zScaleMax = 0.82;

                  const wx1 = frx + (brx - frx) * t1;
                  const wy1 = fry + (bry - fry) * t1;
                  const wx2 = frx + (brx - frx) * t2;
                  const wy2 = fry + (bry - fry) * t2;

                  const wp1 = toIso(wx1, wy1, zStart + vH * zScaleMin);
                  const wp2 = toIso(wx2, wy2, zStart + vH * zScaleMin);
                  const wp3 = toIso(wx2, wy2, zStart + vH * zScaleMax);
                  const wp4 = toIso(wx1, wy1, zStart + vH * zScaleMax);

                  ctx.beginPath();
                  ctx.moveTo(wp1.x, wp1.y);
                  ctx.lineTo(wp2.x, wp2.y);
                  ctx.lineTo(wp3.x, wp3.y);
                  ctx.lineTo(wp4.x, wp4.y);
                  ctx.closePath();
                  ctx.fill();
                }
              }
            }
          });

          // Top Face
          ctx.fillStyle = hasWindows ? '#d0d5de' : baseColor; // greyish-white roof for buses
          ctx.beginPath();
          ctx.moveTo(pBL_top.x, pBL_top.y);
          ctx.lineTo(pBR_top.x, pBR_top.y);
          ctx.lineTo(pFR_top.x, pFR_top.y);
          ctx.lineTo(pFL_top.x, pFL_top.y);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = hasWindows ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)';
          ctx.lineWidth = 0.5;
          ctx.stroke();

          return { pFL_bot, pFR_bot, pBL_bot, pBR_bot, flx, fly, frx, fry };
        }

        let baseCoords = null;

        if (c.type === 'car') {
          // Draw Car: Base + Cabin
          baseCoords = drawVehicleBox(cx_v, cy_v, 0, L, W, H * 0.55, c.color, false);
          
          const cabCX = cx_v - dirX * (L * 0.12);
          const cabCY = cy_v - dirY * (L * 0.12);
          drawVehicleBox(cabCX, cabCY, H * 0.55, L * 0.55, W * 0.85, H * 0.45, c.color, false);

        } else if (c.type === 'bus') {
          // Draw Bus: Tall single box with windows
          baseCoords = drawVehicleBox(cx_v, cy_v, 0, L, W, H, c.color, true);

        } else if (c.type === 'bike') {
          // Draw Motorcycle: Thin chassis + tiny rider
          baseCoords = drawVehicleBox(cx_v, cy_v, 0, L, W * 0.65, H * 0.52, '#2f343f', false);
          
          const riderCX = cx_v - dirX * 0.5;
          const riderCY = cy_v - dirY * 0.5;
          drawVehicleBox(riderCX, riderCY, H * 0.52, L * 0.45, W * 0.65, H * 0.48, '#1d2028', false);
        }

        if (baseCoords) {
          const { pFL_bot, pFR_bot, pBL_bot, pBR_bot, flx, fly, frx, fry } = baseCoords;

          // Draw a very subtle headlight cast polygon on the street
          const beamLength = 6;
          const pFR_beam = toIso(frx + dirX * beamLength, fry + dirY * beamLength, 0);
          const pFL_beam = toIso(flx + dirX * beamLength, fly + dirY * beamLength, 0);

          ctx.fillStyle = 'rgba(255, 255, 220, 0.035)'; // Very faint casting light
          ctx.beginPath();
          ctx.moveTo(pFL_bot.x, pFL_bot.y);
          ctx.lineTo(pFR_bot.x, pFR_bot.y);
          ctx.lineTo(pFR_beam.x, pFR_beam.y);
          ctx.lineTo(pFL_beam.x, pFL_beam.y);
          ctx.closePath();
          ctx.fill();

          // Soft headlights (no glow)
          ctx.fillStyle = 'rgba(255, 255, 220, 0.88)';
          ctx.beginPath();
          ctx.arc(pFL_bot.x, pFL_bot.y - 0.4, 0.9, 0, Math.PI*2);
          ctx.arc(pFR_bot.x, pFR_bot.y - 0.4, 0.9, 0, Math.PI*2);
          ctx.fill();

          // Soft taillights (no glow)
          ctx.fillStyle = 'rgba(220, 50, 50, 0.9)';
          ctx.beginPath();
          ctx.arc(pBL_bot.x, pBL_bot.y - 0.4, 0.7, 0, Math.PI*2);
          ctx.arc(pBR_bot.x, pBR_bot.y - 0.4, 0.7, 0, Math.PI*2);
          ctx.fill();
        }
      }
    });

    requestAnimationFrame(animateTraffic);
  }
  animateTraffic();
}

/* [Sections 2 & 3 removed: Telemetry and Radar UI components deleted] */

/* ═════════════════════════════════════════════════
   4. DBSCAN SCROLL-DRIVEN CLUSTERING SIMULATOR
   ═════════════════════════════════════════════════ */
const dbCanvas = document.getElementById('dbscan-canvas');
if (dbCanvas) {
  const dCtx = dbCanvas.getContext('2d');
  const dSize = dbCanvas.width = dbCanvas.height = 480;

  // Define cluster nodes (tactical, muted palette)
  const clusters = [
    { cx: 120, cy: 130, r: 40, color: '#b34343' }, // MG Road (crimson)
    { cx: 350, cy: 160, r: 45, color: '#3b528b' }, // Silk Board (navy)
    { cx: 240, cy: 320, r: 50, color: '#d29a28' }, // Koramangala (amber)
    { cx: 150, cy: 260, r: 35, color: '#2e7d32' }, // Indiranagar (forest green)
  ];

  let points = [];
  const totalPoints = 150;

  // Initialize scattered coordinates and destination targets
  for (let i = 0; i < totalPoints; i++) {
    const startX = 40 + Math.random() * (dSize - 80);
    const startY = 40 + Math.random() * (dSize - 80);
    
    // Choose if it belongs to a cluster or is noise (last 20% is noise)
    const isNoise = i > totalPoints * 0.85;
    const cluster = clusters[i % clusters.length];
    
    // Destination inside the cluster
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * (cluster.r - 8);
    const destX = cluster.cx + Math.cos(angle) * dist;
    const destY = cluster.cy + Math.sin(angle) * dist;

    points.push({
      sx: startX,
      sy: startY,
      dx: isNoise ? startX : destX,
      dy: isNoise ? startY : destY,
      cx: startX,
      cy: startY,
      isNoise: isNoise,
      color: isNoise ? '#edf2ff' : cluster.color,
      size: isNoise ? 1.5 : 2
    });
  }

  let scrollProgress = 0;

  window.updateDBSCANProgress = function (progress) {
    scrollProgress = progress;
  };

  function renderClusters() {
    dCtx.fillStyle = '#070b14';
    dCtx.fillRect(0, 0, dSize, dSize);

    // Draw grid overlay
    dCtx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    dCtx.lineWidth = 1;
    for (let i = 0; i < dSize; i += 40) {
      dCtx.beginPath(); dCtx.moveTo(i, 0); dCtx.lineTo(i, dSize); dCtx.stroke();
      dCtx.beginPath(); dCtx.moveTo(0, i); dCtx.lineTo(dSize, i); dCtx.stroke();
    }

    // Draw cluster halo regions (glow expand when scroll progress is high)
    if (scrollProgress > 0.45) {
      const alphaScale = Math.min((scrollProgress - 0.45) / 0.55, 1);
      clusters.forEach(c => {
        dCtx.strokeStyle = c.color;
        dCtx.lineWidth = 1;
        dCtx.beginPath();
        // Expanding ring
        const ringRadius = c.r + (1.0 - scrollProgress) * 20;
        dCtx.arc(c.cx, c.cy, ringRadius, 0, Math.PI * 2);
        dCtx.fillStyle = `${c.color}06`; // very transparent
        dCtx.fill();
        dCtx.stroke();

        // Draw core node label indicator
        dCtx.fillStyle = c.color;
        dCtx.font = '600 9px monospace';
        dCtx.fillText("CLUSTER CORE", c.cx - 30, c.cy - c.r - 8);
      });
    }

    // Update and draw points
    points.forEach(p => {
      // Lerp point coordinate
      p.cx = p.sx + (p.dx - p.sx) * scrollProgress;
      p.cy = p.sy + (p.dy - p.sy) * scrollProgress;

      dCtx.fillStyle = p.isNoise ? `rgba(180, 190, 210, ${0.35 + (1 - scrollProgress) * 0.35})` : p.color;
      dCtx.shadowBlur = p.isNoise ? 0 : 1.5;
      dCtx.shadowColor = p.color;
      dCtx.beginPath();
      dCtx.arc(p.cx, p.cy, p.size, 0, Math.PI * 2);
      dCtx.fill();
      dCtx.shadowBlur = 0;
    });

    requestAnimationFrame(renderClusters);
  }
  renderClusters();
}

/* ═════════════════════════════════════════════════
   5. GSAP SCROLLTRIGGER SCROLL-DRIVEN ANIMATIONS
   ═════════════════════════════════════════════════ */

// CCTV grid rotation descent animation
const grid = document.querySelector('.cctv-grid');
if (grid) {
  gsap.fromTo('.cctv-card', 
    {
      opacity: 0,
      y: 120,
      rotationX: 25,
      rotationY: -15,
      scale: 0.92
    },
    {
      opacity: 1,
      y: 0,
      rotationX: 0,
      rotationY: 0,
      scale: 1,
      stagger: 0.12,
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '#section-cctv',
        start: 'top 75%',
        end: 'top 25%',
        scrub: 1
      }
    }
  );
}

// Pin and animate DBSCAN clustering canvas
const dbscanWrap = document.getElementById('dbscan-canvas-wrap');
if (dbscanWrap) {
  ScrollTrigger.create({
    trigger: '#section-dbscan',
    start: 'top top',
    end: 'bottom bottom',
    pin: '#dbscan-canvas-wrap',
    scrub: true,
    onUpdate: (self) => {
      if (window.updateDBSCANProgress) {
        window.updateDBSCANProgress(self.progress);
      }
    }
  });
}



/* ── Entrance Animations (Hero) ──────────────── */
window.addEventListener('load', () => {
  gsap.to('#nav', {
    opacity: 1, y: 0, duration: 1,
    delay: 0.2, ease: 'power3.out',
  });

  gsap.from('#hero-center', {
    opacity: 0, y: 40, duration: 1.3,
    delay: 0.5, ease: 'power3.out'
  });


});
