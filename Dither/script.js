// ============================================================
//  Image Dither Lab (Ditherboy-style controls)
// ============================================================

// DOM elements
const imageInput = document.getElementById("imageInput");
const methodSelect = document.getElementById("methodSelect");
const modeSelect = document.getElementById("modeSelect");
const ditherBtn = document.getElementById("ditherBtn");
const downloadBtn = document.getElementById("downloadBtn");

const originalCanvas = document.getElementById("originalCanvas");
const ditheredCanvas = document.getElementById("ditheredCanvas");
const previewCanvas = document.getElementById("previewCanvas");
const debugLog = document.getElementById("debugLog");

const originalCtx = originalCanvas.getContext("2d");
const ditheredCtx = ditheredCanvas.getContext("2d");
const previewCtx = previewCanvas.getContext("2d");

// Sliders
const brightnessSlider = document.getElementById("brightness");
const contrastSlider = document.getElementById("contrast");
const gammaSlider = document.getElementById("gamma");
const thresholdSlider = document.getElementById("threshold");
const scaleSlider = document.getElementById("scale");
const blackSlider = document.getElementById("blackPoint");
const whiteSlider = document.getElementById("whitePoint");

// Slider value labels
const brightnessVal = document.getElementById("brightnessVal");
const contrastVal = document.getElementById("contrastVal");
const gammaVal = document.getElementById("gammaVal");
const thresholdVal = document.getElementById("thresholdVal");
const scaleVal = document.getElementById("scaleVal");
const blackVal = document.getElementById("blackVal");
const whiteVal = document.getElementById("whiteVal");

// Palette
const fgColorInput = document.getElementById("fgColor");
const bgColorInput = document.getElementById("bgColor");

// Zoom
const zoomSlider = document.getElementById("zoomSlider");
const zoomVal = document.getElementById("zoomVal");

// State
let loadedImage = null;

// ============================================================
// Utility: debug logger
// ============================================================
function debug(msg) {
  const time = new Date().toLocaleTimeString();
  if (debugLog.textContent === "(No logs yet)") {
    debugLog.textContent = `[${time}] ${msg}\n`;
  } else {
    debugLog.textContent += `[${time}] ${msg}\n`;
  }
  debugLog.scrollTop = debugLog.scrollHeight;
}

// Utility: parse #rrggbb
function parseHexColor(hex) {
  if (!hex || hex[0] !== "#" || (hex.length !== 7)) {
    return { r: 255, g: 255, b: 255 };
  }
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return { r, g, b };
}

// ============================================================
// Image loading (file input + drag & drop)
// ============================================================
function loadImageFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    debug("Dropped file is not an image.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      loadedImage = img;

      originalCanvas.width = img.width;
      originalCanvas.height = img.height;
      ditheredCanvas.width = img.width;
      ditheredCanvas.height = img.height;

      originalCtx.clearRect(0, 0, img.width, img.height);
      originalCtx.drawImage(img, 0, 0);

      // Preview canvas is fixed-ish size
      const maxPreview = 260;
      const scale = Math.min(1, maxPreview / img.width, maxPreview / img.height);
      previewCanvas.width = Math.max(1, Math.floor(img.width * scale));
      previewCanvas.height = Math.max(1, Math.floor(img.height * scale));
      previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

      debug(`Image loaded: ${img.width}×${img.height} (${file.name})`);
      applyDither(methodSelect.value, modeSelect.value, /*forPreviewOnly*/ true);
    };
    img.onerror = () => debug("Error decoding image.");
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  loadImageFile(file);
});

// Drag & drop anywhere
document.addEventListener("dragover", (e) => {
  e.preventDefault();
});

document.addEventListener("drop", (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) {
    debug("File dropped.");
    loadImageFile(file);
  }
});

// ============================================================
// Zoom controls for dithered canvas
// ============================================================
function updateZoom() {
  const z = Number(zoomSlider.value);
  zoomVal.textContent = `${z.toFixed(1)}×`;
  ditheredCanvas.style.transform = `scale(${z})`;
}
zoomSlider.addEventListener("input", updateZoom);
updateZoom();

// ============================================================
// Sliders → live update
// ============================================================
function refreshSliderLabels() {
  brightnessVal.textContent = brightnessSlider.value;
  contrastVal.textContent = contrastSlider.value;
  gammaVal.textContent = gammaSlider.value;
  thresholdVal.textContent = thresholdSlider.value;
  scaleVal.textContent = scaleSlider.value;
  blackVal.textContent = blackSlider.value;
  whiteVal.textContent = whiteSlider.value;
}

function slidersChanged() {
  refreshSliderLabels();
  if (loadedImage) {
    // Fast feedback: recompute and update preview + dithered
    applyDither(methodSelect.value, modeSelect.value, true);
  }
}

[
  brightnessSlider,
  contrastSlider,
  gammaSlider,
  thresholdSlider,
  scaleSlider,
  blackSlider,
  whiteSlider,
  methodSelect,
  modeSelect,
  fgColorInput,
  bgColorInput
].forEach(el => {
  el.addEventListener("input", slidersChanged);
});

refreshSliderLabels();

// ============================================================
// Dithering pipeline
// ============================================================
ditherBtn.addEventListener("click", () => {
  if (!loadedImage) {
    debug("Cannot dither: no image loaded.");
    return;
  }
  applyDither(methodSelect.value, modeSelect.value, false);
});

function applyDither(method, mode, forPreviewOnly) {
  if (!loadedImage) return;

  const w = loadedImage.width;
  const h = loadedImage.height;

  // Work canvas for sampling
  const workCanvas = document.createElement("canvas");
  const workCtx = workCanvas.getContext("2d");
  workCanvas.width = w;
  workCanvas.height = h;
  workCtx.drawImage(loadedImage, 0, 0, w, h);

  const srcData = workCtx.getImageData(0, 0, w, h);
  const src = srcData.data;

  // 1. Convert to grayscale luminance
  let lum = new Float32Array(w * h);
  for (let i = 0, j = 0; i < src.length; i += 4, j++) {
    const r = src[i];
    const g = src[i + 1];
    const b = src[i + 2];
    lum[j] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // 2. Downscale based on "scale" slider
  const scalePct = Number(scaleSlider.value) / 100;
  const dw = Math.max(1, Math.floor(w * scalePct));
  const dh = Math.max(1, Math.floor(h * scalePct));

  let lumSmall = new Float32Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const sx = Math.floor((x / dw) * w);
      const sy = Math.floor((y / dh) * h);
      lumSmall[y * dw + x] = lum[sy * w + sx];
    }
  }

  // 3. Apply brightness / contrast / gamma / threshold offset / levels
  const B = Number(brightnessSlider.value);       // -100..100
  const C = Number(contrastSlider.value) / 100;   // 0..3
  const G = Number(gammaSlider.value);           // 0.1..3
  const T = Number(thresholdSlider.value);       // -128..128
  const BP = Number(blackSlider.value);          // 0..127
  const WP = Number(whiteSlider.value);          // 128..255
  const eps = 1e-3;
  const levelsRange = Math.max(eps, WP - BP);

  for (let i = 0; i < lumSmall.length; i++) {
    let v = lumSmall[i];

    v += B;                        // brightness
    v = ((v - 128) * C) + 128;     // contrast
    v = 255 * Math.pow(v / 255, 1 / G); // gamma
    v += T;                        // threshold offset

    // Levels mapping
    v = (v - BP) * (255 / levelsRange);

    v = Math.min(255, Math.max(0, v));
    lumSmall[i] = v;
  }

  // 4. Create output buffer for small image
  let tinyData = new Uint8ClampedArray(dw * dh * 4);

  if (mode === "gray") {
    // Grayscale only, no dithering
    for (let i = 0; i < lumSmall.length; i++) {
      const L = lumSmall[i];
      const p = i * 4;
      tinyData[p] = L;
      tinyData[p + 1] = L;
      tinyData[p + 2] = L;
      tinyData[p + 3] = 255;
    }
  } else {
    const fg = parseHexColor(fgColorInput.value);
    const bg = parseHexColor(bgColorInput.value);
    const usePalette = (mode === "palette");

    switch (method) {
      case "floyd":
        ditherFloyd(lumSmall, tinyData, dw, dh, usePalette, fg, bg);
        break;
      case "ordered":
        ditherOrdered(lumSmall, tinyData, dw, dh, usePalette, fg, bg);
        break;
      case "atkinson":
        ditherAtkinson(lumSmall, tinyData, dw, dh, usePalette, fg, bg);
        break;
      case "sierra":
        ditherSierraLite(lumSmall, tinyData, dw, dh, usePalette, fg, bg);
        break;
      case "burkes":
        ditherBurkes(lumSmall, tinyData, dw, dh, usePalette, fg, bg);
        break;
      default:
        ditherFloyd(lumSmall, tinyData, dw, dh, usePalette, fg, bg);
        break;
    }
  }

  // 5. Write small result to a tiny canvas
  const tinyCanvas = document.createElement("canvas");
  tinyCanvas.width = dw;
  tinyCanvas.height = dh;
  const tinyCtx = tinyCanvas.getContext("2d");
  tinyCtx.putImageData(new ImageData(tinyData, dw, dh), 0, 0);

  // 6. Draw to dithered canvas (export resolution)
  const outW = loadedImage.width;
  const outH = loadedImage.height;
  ditheredCanvas.width = outW;
  ditheredCanvas.height = outH;
  ditheredCtx.imageSmoothingEnabled = false;
  ditheredCtx.clearRect(0, 0, outW, outH);
  ditheredCtx.drawImage(tinyCanvas, 0, 0, dw, dh, 0, 0, outW, outH);

  // 7. Draw scaled preview
  const maxPreview = 260;
  const s = Math.min(1, maxPreview / outW, maxPreview / outH);
  const pw = Math.max(1, Math.floor(outW * s));
  const ph = Math.max(1, Math.floor(outH * s));
  previewCanvas.width = pw;
  previewCanvas.height = ph;
  previewCtx.imageSmoothingEnabled = false;
  previewCtx.clearRect(0, 0, pw, ph);
  previewCtx.drawImage(ditheredCanvas, 0, 0, outW, outH, 0, 0, pw, ph);

  downloadBtn.disabled = false;

  if (!forPreviewOnly) {
    debug(`Dithering applied. Method=${method}, mode=${mode}, dw=${dw}, dh=${dh}`);
  }
}

// ============================================================
// Dithering algorithms
// ============================================================
function writePixel(out, idx, bit, usePalette, fg, bg) {
  if (usePalette) {
    const c = bit ? fg : bg;
    out[idx] = c.r;
    out[idx + 1] = c.g;
    out[idx + 2] = c.b;
  } else {
    const v = bit ? 255 : 0;
    out[idx] = v;
    out[idx + 1] = v;
    out[idx + 2] = v;
  }
  out[idx + 3] = 255;
}

// Floyd–Steinberg
function ditherFloyd(lum, out, w, h, usePalette, fg, bg) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const oldVal = lum[i];
      const bit = oldVal >= 128 ? 1 : 0;
      const newVal = bit ? 255 : 0;
      const err = oldVal - newVal;

      const p = i * 4;
      writePixel(out, p, bit, usePalette, fg, bg);

      if (x + 1 < w) lum[i + 1] += err * 7 / 16;
      if (y + 1 < h) {
        if (x > 0) lum[i + w - 1] += err * 3 / 16;
        lum[i + w] += err * 5 / 16;
        if (x + 1 < w) lum[i + w + 1] += err * 1 / 16;
      }
    }
  }
}

// Ordered (4×4 Bayer)
function ditherOrdered(lum, out, w, h, usePalette, fg, bg) {
  const bayer = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5]
  ];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const L = lum[i] / 255;
      const t = (bayer[y & 3][x & 3] + 0.5) / 16;
      const bit = (L >= t) ? 1 : 0;

      const p = i * 4;
      writePixel(out, p, bit, usePalette, fg, bg);
    }
  }
}

// Atkinson
function ditherAtkinson(lum, out, w, h, usePalette, fg, bg) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const oldVal = lum[i];
      const bit = oldVal >= 128 ? 1 : 0;
      const newVal = bit ? 255 : 0;
      const err = (oldVal - newVal) / 8;

      const p = i * 4;
      writePixel(out, p, bit, usePalette, fg, bg);

      if (x + 1 < w) lum[i + 1] += err;
      if (x + 2 < w) lum[i + 2] += err;
      if (y + 1 < h) {
        if (x > 0) lum[i + w - 1] += err;
        lum[i + w] += err;
        if (x + 1 < w) lum[i + w + 1] += err;
      }
      if (y + 2 < h) {
        lum[i + 2 * w] += err;
      }
    }
  }
}

// Sierra Lite
function ditherSierraLite(lum, out, w, h, usePalette, fg, bg) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const oldVal = lum[i];
      const bit = oldVal >= 128 ? 1 : 0;
      const newVal = bit ? 255 : 0;
      const err = oldVal - newVal;

      const p = i * 4;
      writePixel(out, p, bit, usePalette, fg, bg);

      if (x + 1 < w) lum[i + 1] += err * 2 / 4;
      if (y + 1 < h) {
        if (x > 0) lum[i + w - 1] += err * 1 / 4;
        lum[i + w] += err * 1 / 4;
      }
    }
  }
}

// Burkes
function ditherBurkes(lum, out, w, h, usePalette, fg, bg) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const oldVal = lum[i];
      const bit = oldVal >= 128 ? 1 : 0;
      const newVal = bit ? 255 : 0;
      const err = oldVal - newVal;

      const p = i * 4;
      writePixel(out, p, bit, usePalette, fg, bg);

      // next row / neighbors according to Burkes kernel
      const weights = [
        { dx: 1, dy: 0, w: 8 },
        { dx: 2, dy: 0, w: 4 },
        { dx: -2, dy: 1, w: 2 },
        { dx: -1, dy: 1, w: 4 },
        { dx: 0, dy: 1, w: 8 },
        { dx: 1, dy: 1, w: 4 },
        { dx: 2, dy: 1, w: 2 }
      ];
      const norm = 32;

      for (const { dx, dy, w: weight } of weights) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          lum[ny * w + nx] += err * (weight / norm);
        }
      }
    }
  }
}

// ============================================================
// Download
// ============================================================
downloadBtn.addEventListener("click", () => {
  if (downloadBtn.disabled) return;
  const link = document.createElement("a");
  link.download = "dithered.png";
  link.href = ditheredCanvas.toDataURL("image/png");
  link.click();
  debug("Dithered image downloaded as dithered.png");
});
