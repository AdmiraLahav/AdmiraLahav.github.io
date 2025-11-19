// ----- CONFIG --------------------------------------------------------------

const CONFIG = {
  sectors: 8,
  baseGridSpacing: 150, // world units
  minZoom: 0.4,
  maxZoom: 4.0,
  initialZoom: 1.0,
  sweepSpeed: 0.35 * Math.PI, // radians per second
  blipRadiusPx: 5,
  blipTrailLength: 24,
  fadeCycleSeconds: 3.5, // how long for a full fade in/out cycle
  targetWidgetSize: 140
};

// ----- DOM ELEMENTS --------------------------------------------------------

const canvas = document.getElementById("radar-canvas");
const metaEl = document.getElementById("radar-meta");
const zoomLine = document.getElementById("zoom-line");
const centerLine = document.getElementById("center-line");
const sectorsLine = document.getElementById("sectors-line");
const targetInfoEl = document.getElementById("target-info");

const widgetEl = document.getElementById("target-widget");
const widgetCanvas = document.getElementById("target-widget-canvas");
const widgetInfoEl = document.getElementById("target-widget-info");
const widgetCtx = widgetCanvas.getContext("2d");

// ----- CANVAS SETUP --------------------------------------------------------

const ctx = canvas.getContext("2d");
let width = 0;
let height = 0;
let radarRadius = 0;

// ----- WORLD / VIEW STATE --------------------------------------------------

// World coordinate center currently focused in view
let viewCenter = { x: 0, y: 0 };

// scale: pixels per world unit
let zoom = CONFIG.initialZoom;

// Sweep angle
let sweepAngle = 0;

// Mouse / interaction
let mouse = { x: 0, y: 0, inside: false };
let isPanning = false;
let panStart = { x: 0, y: 0 };
let panViewStart = { x: 0, y: 0 };

// Targets
let targets = [];
let hoveredTarget = null;

// Time
let lastTime = performance.now();

// ----- UTILS ---------------------------------------------------------------

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

// Convert world (x,y) to screen coordinates within radar square
function worldToScreen(wx, wy) {
  const cx = width / 2;
  const cy = height / 2;
  const sx = cx + (wx - viewCenter.x) * zoom;
  const sy = cy + (wy - viewCenter.y) * zoom;
  return { x: sx, y: sy };
}

// Convert screen to world coordinates (for zoom anchoring)
function screenToWorld(sx, sy) {
  const cx = width / 2;
  const cy = height / 2;
  const wx = (sx - cx) / zoom + viewCenter.x;
  const wy = (sy - cy) / zoom + viewCenter.y;
  return { x: wx, y: wy };
}

// ----- RESIZE --------------------------------------------------------------

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  width = rect.width;
  height = rect.height;
  radarRadius = Math.min(width, height) * 0.45;

  widgetCanvas.width = CONFIG.targetWidgetSize * dpr;
  widgetCanvas.height = CONFIG.targetWidgetSize * dpr;
  widgetCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  widgetCanvas.style.width = CONFIG.targetWidgetSize + "px";
  widgetCanvas.style.height = CONFIG.targetWidgetSize + "px";
}

window.addEventListener("resize", resize);
resize();

// ----- LOAD TARGETS --------------------------------------------------------

async function loadTargets() {
  try {
    const response = await fetch("targets.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const json = await response.json();

    targets = json.map((t) => ({
      ...t,
      dirRad: degToRad(t.directionDeg),
      fadePhase: Math.random() * Math.PI * 2,
      history: [], // past positions for trail
      lastUpdate: performance.now()
    }));
    metaEl.textContent = `TARGETS: ${targets.length} • READY`;
  } catch (e) {
    // Fallback sample if JSON not found / local testing
    console.error("Failed to load targets.json", e);
    metaEl.textContent = "TARGETS: FALLBACK SAMPLE • JSON LOAD FAILED";

    targets = [
      {
        id: "FALLBACK-1",
        label: "SAMPLE-1",
        type: "sim",
        x: 300,
        y: -200,
        speed: 60,
        directionDeg: 45,
        dirRad: degToRad(45),
        altitude: 3000,
        threat: "low",
        fadePhase: Math.random() * Math.PI * 2,
        history: [],
        lastUpdate: performance.now()
      }
    ];
  }
}

loadTargets();

// ----- INPUT HANDLERS ------------------------------------------------------

canvas.addEventListener("mouseenter", () => {
  mouse.inside = true;
});

canvas.addEventListener("mouseleave", () => {
  mouse.inside = false;
  hoveredTarget = null;
  widgetEl.classList.remove("visible");
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;

  if (isPanning) {
    const dx = mouse.x - panStart.x;
    const dy = mouse.y - panStart.y;
    viewCenter.x = panViewStart.x - dx / zoom;
    viewCenter.y = panViewStart.y - dy / zoom;
  }
});

canvas.addEventListener("mousedown", (e) => {
  // Right button drag pans
  if (e.button === 2) {
    isPanning = true;
    const rect = canvas.getBoundingClientRect();
    panStart.x = e.clientX - rect.left;
    panStart.y = e.clientY - rect.top;
    panViewStart.x = viewCenter.x;
    panViewStart.y = viewCenter.y;
  }
});

canvas.addEventListener("mouseup", (e) => {
  if (e.button === 2) {
    isPanning = false;
  }
});

// prevent context menu for right-click drags
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

// Mouse wheel zoom (cursor as anchor point)
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldBefore = screenToWorld(sx, sy);

    const delta = -e.deltaY;
    const zoomFactor = delta > 0 ? 1.1 : 0.9;
    const newZoom = clamp(zoom * zoomFactor, CONFIG.minZoom, CONFIG.maxZoom);
    zoom = newZoom;

    const worldAfter = screenToWorld(sx, sy);
    // Adjust view center so the world point under cursor stays fixed
    viewCenter.x += worldBefore.x - worldAfter.x;
    viewCenter.y += worldBefore.y - worldAfter.y;
  },
  { passive: false }
);

// ----- RENDER GRID / SECTORS / DISTORTION ----------------------------------

function drawGrid(time) {
  ctx.save();

  const cx = width / 2;
  const cy = height / 2;

  // Background
  const bgGrad = ctx.createRadialGradient(
    cx,
    cy,
    0,
    cx,
    cy,
    radarRadius * 1.2
  );
  bgGrad.addColorStop(0, "rgba(15,23,42,0.4)");
  bgGrad.addColorStop(1, "rgba(3,7,18,1)");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.translate(cx, cy);

  // Sectors (only lines, no labels)
  ctx.strokeStyle = "rgba(15,118,110,0.6)";
  ctx.lineWidth = 1;

  const sectorAngle = (Math.PI * 2) / CONFIG.sectors;
  for (let i = 0; i < CONFIG.sectors; i++) {
    const ang = i * sectorAngle;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(ang) * radarRadius, Math.sin(ang) * radarRadius);
    ctx.stroke();
  }

  // Circular rings with sweep-based distortion
  const ringCount = 5;
  const wobbleAmp = 7;
  const wobbleFreq = 4;

  for (let i = 1; i <= ringCount; i++) {
    const baseR = (radarRadius * i) / ringCount;
    ctx.beginPath();
    const steps = 120;
    for (let s = 0; s <= steps; s++) {
      const angle = (s / steps) * Math.PI * 2;
      const diff =
        Math.atan2(Math.sin(angle - sweepAngle), Math.cos(angle - sweepAngle));
      const influence = Math.max(0, 1 - Math.abs(diff) / (Math.PI / 4));
      const wobble =
        wobbleAmp *
        influence *
        Math.sin(time * 1.7 + wobbleFreq * (angle - sweepAngle));
      const r = baseR + wobble;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(37,99,235,0.35)";
    ctx.stroke();
  }

  // Outer boundary
  ctx.beginPath();
  ctx.arc(0, 0, radarRadius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(56,189,248,0.75)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

// Straight Cartesian grid in world coordinates (increases detail with zoom)
function drawCartesianGrid() {
  ctx.save();
  const spacingCandidates = [400, 300, 200, 150, 100, 60, 40];
  let spacingWorld = spacingCandidates[0];
  for (const s of spacingCandidates) {
    if (zoom * s >= 60) {
      spacingWorld = s;
      break;
    }
  }

  const cx = width / 2;
  const cy = height / 2;

  const leftWorld = viewCenter.x - cx / zoom;
  const rightWorld = viewCenter.x + cx / zoom;
  const topWorld = viewCenter.y - cy / zoom;
  const bottomWorld = viewCenter.y + cy / zoom;

  const startX =
    Math.floor(leftWorld / spacingWorld) * spacingWorld - spacingWorld;
  const endX =
    Math.ceil(rightWorld / spacingWorld) * spacingWorld + spacingWorld;
  const startY =
    Math.floor(topWorld / spacingWorld) * spacingWorld - spacingWorld;
  const endY =
    Math.ceil(bottomWorld / spacingWorld) * spacingWorld + spacingWorld;

  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(15,23,42,0.8)";

  // vertical lines
  for (let x = startX; x <= endX; x += spacingWorld) {
    const sx = worldToScreen(x, 0).x;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, height);
    ctx.stroke();
  }

  // horizontal lines
  for (let y = startY; y <= endY; y += spacingWorld) {
    const sy = worldToScreen(0, y).y;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(width, sy);
    ctx.stroke();
  }

  ctx.restore();
}

// ----- SWEEP BEAM ----------------------------------------------------------

function drawSweep(dt) {
  const cx = width / 2;
  const cy = height / 2;

  ctx.save();
  ctx.translate(cx, cy);

  // Main sweep update (rotation)
  sweepAngle += CONFIG.sweepSpeed * dt;
  if (sweepAngle > Math.PI * 2) sweepAngle -= Math.PI * 2;

  const sweepWidth = Math.PI / 25;
  const steps = 16;

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const ang = sweepAngle - t * sweepWidth;
    const alpha = (1 - t) * 0.55;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radarRadius, ang - sweepWidth / 3, ang + sweepWidth / 3);
    ctx.closePath();

    ctx.fillStyle = `rgba(56,189,248,${alpha})`;
    ctx.fill();
  }

  ctx.restore();
}

// ----- TARGET UPDATE & DRAW ------------------------------------------------

function updateTargets(dt, now) {
  const cycle = CONFIG.fadeCycleSeconds;

  for (const target of targets) {
    const speed = target.speed || 0;
    const vx = Math.cos(target.dirRad) * speed;
    const vy = Math.sin(target.dirRad) * speed;

    target.x += vx * dt;
    target.y += vy * dt;

    // fade cycle
    const phase = ((now / 1000 + target.fadePhase) * Math.PI * 2) / cycle;
    let alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(phase));
    target.currentAlpha = alpha;

    // trails
    target.history.push({ x: target.x, y: target.y, time: now });
    while (target.history.length > CONFIG.blipTrailLength) {
      target.history.shift();
    }
  }
}

function drawTrails(now) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (const target of targets) {
    const len = target.history.length;
    if (len < 2) continue;

    for (let i = 1; i < len; i++) {
      const p0 = target.history[i - 1];
      const p1 = target.history[i];
      const age = (now - p1.time) / 1000;
      const alpha = clamp(0.6 - age * 0.4, 0, 0.6);

      const s0 = worldToScreen(p0.x, p0.y);
      const s1 = worldToScreen(p1.x, p1.y);

      ctx.beginPath();
      ctx.moveTo(s0.x, s0.y);
      ctx.lineTo(s1.x, s1.y);
      ctx.strokeStyle = `rgba(34,197,94,${alpha})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawTargets(now) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const cx = width / 2;
  const cy = height / 2;

  hoveredTarget = null;
  let hoverDistSqMin = Infinity;

  for (const target of targets) {
    const screenPos = worldToScreen(target.x, target.y);

    // Only draw inside radar circle
    const dxRadar = screenPos.x - cx;
    const dyRadar = screenPos.y - cy;
    const distFromCenter = Math.sqrt(dxRadar * dxRadar + dyRadar * dyRadar);
    if (distFromCenter > radarRadius) continue;

    // check hover
    if (mouse.inside) {
      const dx = screenPos.x - mouse.x;
      const dy = screenPos.y - mouse.y;
      const dSq = dx * dx + dy * dy;
      const threshold = 14; // px
      if (dSq < threshold * threshold && dSq < hoverDistSqMin) {
        hoverDistSqMin = dSq;
        hoveredTarget = { target, screenPos };
      }
    }

    const alpha = target.currentAlpha || 1;

    // outer glow
    ctx.beginPath();
    ctx.arc(
      screenPos.x,
      screenPos.y,
      CONFIG.blipRadiusPx * 2.3,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = `rgba(56,189,248,${0.08 * alpha})`;
    ctx.fill();

    // solid circle (size constant in pixels)
    ctx.beginPath();
    ctx.arc(
      screenPos.x,
      screenPos.y,
      CONFIG.blipRadiusPx,
      0,
      Math.PI * 2
    );
    const color =
      target.threat === "high"
        ? "rgba(248,113,113," + alpha + ")"
        : target.threat === "medium"
        ? "rgba(251,191,36," + alpha + ")"
        : "rgba(34,197,94," + alpha + ")";
    ctx.fillStyle = color;
    ctx.fill();

    // direction line (movement vector)
    const angle = target.dirRad;
    const len = 28; // constant in px
    const x2 = screenPos.x + Math.cos(angle) * len;
    const y2 = screenPos.y + Math.sin(angle) * len;

    ctx.beginPath();
    ctx.moveTo(screenPos.x, screenPos.y);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = `rgba(248,113,113,${alpha})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  ctx.restore();
}

// ----- HOVER WIDGET & SIDE INFO -------------------------------------------

function renderTargetWidget() {
  if (!hoveredTarget) {
    widgetEl.classList.remove("visible");
    targetInfoEl.innerHTML =
      '<div class="placeholder">Hover a contact to view details.</div>';
    return;
  }

  const { target, screenPos } = hoveredTarget;

  // Position widget near target (offset so it doesn't cover same point)
  const offsetX = 90;
  const offsetY = -90;
  const widgetX = clamp(
    screenPos.x + offsetX,
    CONFIG.targetWidgetSize / 2,
    width - CONFIG.targetWidgetSize / 2
  );
  const widgetY = clamp(
    screenPos.y + offsetY,
    CONFIG.targetWidgetSize / 2,
    height - CONFIG.targetWidgetSize / 2
  );

  widgetEl.style.left = widgetX + "px";
  widgetEl.style.top = widgetY + "px";
  widgetEl.classList.add("visible");

  const wxSize = CONFIG.targetWidgetSize;
  widgetCtx.clearRect(0, 0, wxSize, wxSize);

  const cx = wxSize / 2;
  const cy = wxSize / 2;

  // Square outer frame
  widgetCtx.strokeStyle = "rgba(148,163,184,0.8)";
  widgetCtx.lineWidth = 1;
  widgetCtx.strokeRect(4.5, 4.5, wxSize - 9, wxSize - 9);

  // Inner circular rings
  widgetCtx.beginPath();
  widgetCtx.arc(cx, cy, 24, 0, Math.PI * 2);
  widgetCtx.strokeStyle = "rgba(148,163,184,0.8)";
  widgetCtx.stroke();

  widgetCtx.beginPath();
  widgetCtx.arc(cx, cy, 14, 0, Math.PI * 2);
  widgetCtx.strokeStyle = "rgba(55,65,81,0.9)";
  widgetCtx.stroke();

  // Center fill
  widgetCtx.beginPath();
  widgetCtx.arc(cx, cy, 6, 0, Math.PI * 2);
  widgetCtx.fillStyle = "rgba(34,197,94,0.9)";
  widgetCtx.fill();

  // Movement direction vector (red, from center to edge)
  const angle = target.dirRad;
  const len = 36;
  const x2 = cx + Math.cos(angle) * len;
  const y2 = cy + Math.sin(angle) * len;
  widgetCtx.beginPath();
  widgetCtx.moveTo(cx, cy);
  widgetCtx.lineTo(x2, y2);
  widgetCtx.strokeStyle = "rgba(248,113,113,0.95)";
  widgetCtx.lineWidth = 2;
  widgetCtx.stroke();

  // Info text
  widgetInfoEl.textContent = `${target.label || target.id || "UNKNOWN"} • ${
    target.type || "TYPE?"
  }`;

  // Side panel data
  targetInfoEl.innerHTML = `
    <div class="target-field">
      <div class="target-label">ID</div>
      <div class="target-value">${target.id || "-"}</div>
    </div>
    <div class="target-field">
      <div class="target-label">LABEL</div>
      <div class="target-value">${target.label || "-"}</div>
    </div>
    <div class="target-field">
      <div class="target-label">TYPE</div>
      <div class="target-value">${target.type || "-"}</div>
    </div>
    <div class="target-field">
      <div class="target-label">POSITION</div>
      <div class="target-value">(${target.x.toFixed(
        1
      )}, ${target.y.toFixed(1)})</div>
    </div>
    <div class="target-field">
      <div class="target-label">SPEED</div>
      <div class="target-value">${(target.speed || 0).toFixed(
        1
      )} wu/s</div>
    </div>
    <div class="target-field">
      <div class="target-label">HEADING</div>
      <div class="target-value">${(target.directionDeg || 0).toFixed(
        1
      )}°</div>
    </div>
    <div class="target-field">
      <div class="target-label">ALTITUDE</div>
      <div class="target-value">${(target.altitude || 0).toFixed(0)} m</div>
    </div>
    <div class="target-field">
      <div class="target-label">THREAT</div>
      <div class="target-value">${target.threat || "unknown"}</div>
    </div>
  `;
}

// ----- CROSSHAIR -----------------------------------------------------------

function drawCrosshair() {
  if (!mouse.inside) return;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const size = 12;
  const thickness = 1.1;

  ctx.strokeStyle = "rgba(248,250,252,0.8)";
  ctx.lineWidth = thickness;

  // Vertical
  ctx.beginPath();
  ctx.moveTo(mouse.x, mouse.y - size);
  ctx.lineTo(mouse.x, mouse.y - size * 0.4);
  ctx.moveTo(mouse.x, mouse.y + size * 0.4);
  ctx.lineTo(mouse.x, mouse.y + size);
  ctx.stroke();

  // Horizontal
  ctx.beginPath();
  ctx.moveTo(mouse.x - size, mouse.y);
  ctx.lineTo(mouse.x - size * 0.4, mouse.y);
  ctx.moveTo(mouse.x + size * 0.4, mouse.y);
  ctx.lineTo(mouse.x + size, mouse.y);
  ctx.stroke();

  ctx.restore();
}

// ----- STATUS TEXT ---------------------------------------------------------

function updateStatus() {
  zoomLine.textContent = `Zoom: x${zoom.toFixed(2)}`;
  centerLine.textContent = `Center: (${viewCenter.x.toFixed(
    1
  )}, ${viewCenter.y.toFixed(1)})`;
  sectorsLine.textContent = `Sectors: ${CONFIG.sectors}`;
}

// ----- MAIN LOOP -----------------------------------------------------------

function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  ctx.clearRect(0, 0, width, height);

  drawCartesianGrid();
  drawGrid(now / 1000);
  drawSweep(dt);
  updateTargets(dt, now);
  drawTrails(now);
  drawTargets(now);
  drawCrosshair();
  renderTargetWidget();
  updateStatus();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
