// =============================
// Simple image dithering app
// =============================

// DOM elements
const imageInput = document.getElementById("imageInput");
const methodSelect = document.getElementById("methodSelect");
const modeSelect = document.getElementById("modeSelect");
const ditherBtn = document.getElementById("ditherBtn");
const downloadBtn = document.getElementById("downloadBtn");

const originalCanvas = document.getElementById("originalCanvas");
const ditheredCanvas = document.getElementById("ditheredCanvas");
const debugLog = document.getElementById("debugLog");

const originalCtx = originalCanvas.getContext("2d");
const ditheredCtx = ditheredCanvas.getContext("2d");

// In-memory original image
let loadedImage = null;

// Small debug logger
function debug(message) {
  const ts = new Date().toISOString().split("T")[1].replace("Z", "");
  const line = `[${ts}] ${message}`;
  if (debugLog.textContent === "(No logs yet)") {
    debugLog.textContent = line;
  } else {
    debugLog.textContent += "\n" + line;
  }
  debugLog.scrollTop = debugLog.scrollHeight;
}

// =============================
// File loading
// =============================

imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) {
    debug("No file selected.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      loadedImage = img;
      drawOriginal(img);
      debug(`Image loaded: ${file.name} (${img.width}x${img.height})`);
    };
    img.onerror = () => {
      debug("Error loading image. Make sure it is a valid image file.");
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

function drawOriginal(img) {
  originalCanvas.width = img.width;
  originalCanvas.height = img.height;
  originalCtx.clearRect(0, 0, img.width, img.height);
  originalCtx.drawImage(img, 0, 0);

  // Mirror the size for the dithered canvas
  ditheredCanvas.width = img.width;
  ditheredCanvas.height = img.height;
  ditheredCtx.clearRect(0, 0, img.width, img.height);
}

// =============================
// Dither button
// =============================

ditherBtn.addEventListener("click", () => {
  if (!loadedImage) {
    debug("Cannot dither: no image loaded.");
    return;
  }
  const method = methodSelect.value; // "floyd" or "ordered"
  const mode = modeSelect.value;     // "mono" or "gray"

  debug(`Applying dithering - method=${method}, mode=${mode}`);
  applyDither(method, mode);
});

// =============================
// Dithering logic
// =============================

function applyDither(method, mode) {
  const w = originalCanvas.width;
  const h = originalCanvas.height;

  const srcData = originalCtx.getImageData(0, 0, w, h);
  const dstData = ditheredCtx.createImageData(w, h);

  // Grayscale luminance buffer used by algorithms
  const lum = new Float32Array(w * h);

  // 1. Build initial grayscale buffer
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = srcData.data[idx + 0];
      const g = srcData.data[idx + 1];
      const b = srcData.data[idx + 2];
      const a = srcData.data[idx + 3];

      // Standard luminance formula
      const L = 0.299 * r + 0.587 * g + 0.114 * b;
      lum[y * w + x] = L;

      // If mode is pure grayscale (no dithering), we handle it later.
      // For dithering modes we'll overwrite dstData anyway.
      dstData.data[idx + 3] = a; // preserve alpha
    }
  }

  if (mode === "gray") {
    // Just copy grayscale into output, no dithering
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const L = lum[y * w + x];
        dstData.data[idx + 0] = L;
        dstData.data[idx + 1] = L;
        dstData.data[idx + 2] = L;
        // alpha already set above
      }
    }
    ditheredCtx.putImageData(dstData, 0, 0);
    downloadBtn.disabled = false;
    debug("Grayscale conversion complete (no dithering).");
    return;
  }

  // 2. Apply selected dithering method
  if (method === "floyd") {
    floydSteinbergDither(lum, dstData, w, h);
  } else if (method === "ordered") {
    orderedDither(lum, dstData, w, h);
  } else {
    debug(`Unknown method "${method}", nothing done.`);
    return;
  }

  ditheredCtx.putImageData(dstData, 0, 0);
  downloadBtn.disabled = false;
  debug("Dithering finished successfully.");
}

/**
 * Floyd–Steinberg error diffusion dithering (monochrome).
 * lum: Float32Array (grayscale values 0–255), modified in-place.
 */
function floydSteinbergDither(lum, dstData, w, h) {
  const threshold = 128;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const oldVal = lum[i];
      const newVal = oldVal < threshold ? 0 : 255;
      const err = oldVal - newVal;

      // Write the quantized pixel to dstData
      const idx = i * 4;
      dstData.data[idx + 0] = newVal;
      dstData.data[idx + 1] = newVal;
      dstData.data[idx + 2] = newVal;
      dstData.data[idx + 3] = 255;

      // Distribute error to neighbors (if inside bounds)
      // (x+1, y)
      if (x + 1 < w) {
        lum[i + 1] += (err * 7) / 16;
      }
      // (x-1, y+1)
      if (x - 1 >= 0 && y + 1 < h) {
        lum[i + w - 1] += (err * 3) / 16;
      }
      // (x, y+1)
      if (y + 1 < h) {
        lum[i + w] += (err * 5) / 16;
      }
      // (x+1, y+1)
      if (x + 1 < w && y + 1 < h) {
        lum[i + w + 1] += (err * 1) / 16;
      }
    }
  }
}

/**
 * Ordered dithering using a 4x4 Bayer matrix (monochrome).
 * Threshold pattern is tiled over the image.
 */
function orderedDither(lum, dstData, w, h) {
  // 4x4 Bayer matrix, values 0–15
  const bayer4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const L = lum[i];

      // Normalize luminance and threshold
      const lumNorm = L / 255;
      const t = (bayer4[y & 3][x & 3] + 0.5) / 16; // (0..1)

      const newVal = lumNorm < t ? 0 : 255;

      const idx = i * 4;
      dstData.data[idx + 0] = newVal;
      dstData.data[idx + 1] = newVal;
      dstData.data[idx + 2] = newVal;
      dstData.data[idx + 3] = 255;
    }
  }
}

// =============================
// Download button
// =============================

downloadBtn.addEventListener("click", () => {
  if (downloadBtn.disabled) return;
  const link = document.createElement("a");
  link.download = "dithered.png";
  link.href = ditheredCanvas.toDataURL("image/png");
  link.click();
  debug("Dithered image downloaded as dithered.png");
});
