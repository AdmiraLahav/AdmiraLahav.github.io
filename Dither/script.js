// ============================================================
//  Image Dither Lab — Advanced
//  Adds:
//    1) RGB color dithering mode
//    5) Dither strength slider
//   12) Video dither player
//   17) Glitch mode (noise + threshold jitter)
// ============================================================

// ---------- DOM refs ----------

const imageInput = document.getElementById("imageInput");
const videoInput = document.getElementById("videoInput");
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

const fgColorInput = document.getElementById("fgColor");
const bgColorInput = document.getElementById("bgColor");

// Sliders
const brightnessSlider = document.getElementById("brightness");
const contrastSlider = document.getElementById("contrast");
const gammaSlider = document.getElementById("gamma");
const thresholdSlider = document.getElementById("threshold");
const scaleSlider = document.getElementById("scale");
const blackSlider = document.getElementById("blackPoint");
const whiteSlider = document.getElementById("whitePoint");
const ditherStrengthSlider = document.getElementById("ditherStrength");
const glitchSlider = document.getElementById("glitchIntensity");

// Slider labels
const brightnessVal = document.getElementById("brightnessVal");
const contrastVal = document.getElementById("contrastVal");
const gammaVal = document.getElementById("gammaVal");
const thresholdVal = document.getElementById("thresholdVal");
const scaleVal = document.getElementById("scaleVal");
const blackVal = document.getElementById("blackVal");
const whiteVal = document.getElementById("whiteVal");
const ditherStrengthVal = document.getElementById("ditherStrengthVal");
const glitchVal = document.getElementById("glitchVal");

// Zoom
const zoomSlider = document.getElementById("zoomSlider");
const zoomVal = document.getElementById("zoomVal");

// Video element (hidden)
const videoEl = document.getElementById("videoElement");

// ---------- State ----------

let loadedSource = null; // HTMLImageElement | HTMLVideoElement
let videoPlaying = false;
let videoRAF = null;

// ---------- Utils ----------

function debug(msg) {
  const time = new Date().toLocaleTimeString();
  if (debugLog.textContent === "(No logs yet)") {
    debugLog.textContent = `[${time}] ${msg}\n`;
  } else {
    debugLog.textContent += `[${time}] ${msg}\n`;
  }
  debugLog.scrollTop = debugLog.scrollHeight;
}

function parseHexColor(hex) {
  if (!hex || hex[0] !== "#" || (hex.length !== 7)) {
    return { r: 255, g: 255, b: 255 };
  }
  return {
    r: parseInt(hex.slice(1, 3), 16) || 0,
    g: parseInt(hex.slice(3, 5), 16) || 0,
    b: parseInt(hex.slice(5, 7), 16) || 0,
  };
}

function getSourceSize() {
  if (!loadedSource) return null;
  if (loadedSource instanceof HTMLVideoElement) {
    return {
      w: loadedSource.videoWidth || 0,
      h: loadedSource.videoHeight || 0,
    };
  }
  return {
    w: loadedSource.width || 0,
    h: loadedSource.height || 0,
  };
}

// ---------- Image loading ----------

imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    debug("Selected file is not an image.");
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      loadedSource = img;
      setupStaticSource(img, file.name);
    };
    img.onerror = () => debug("Error loading image file.");
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

function setupStaticSource(img, name) {
  const w = img.width;
  const h = img.height;

  originalCanvas.width = w;
  originalCanvas.height = h;
  ditheredCanvas.width = w;
  ditheredCanvas.height = h;

  originalCtx.clearRect(0, 0, w, h);
  originalCtx.drawImage(img, 0, 0);

  const s = Math.min(1, 260 / w, 260 / h);
  previewCanvas.width = Math.max(1, Math.floor(w * s));
  previewCanvas.height = Math.max(1, Math.floor(h * s));
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

  debug(`Image loaded: ${name} (${w}×${h})`);
  applyDither(methodSelect.value, modeSelect.value, true);
}

// ---------- Drag & drop ----------

document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("drop", (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (!file) return;
  if (file.type.startsWith("image/")) {
    imageInput.files = e.dataTransfer.files;
    imageInput.dispatchEvent(new Event("change"));
  } else if (file.type.startsWith("video/")) {
    videoInput.files = e.dataTransfer.files;
    videoInput.dispatchEvent(new Event("change"));
  } else {
    debug("Dropped file is not image or video.");
  }
});

// ---------- Video loading & loop ----------

videoInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("video/")) {
    debug("Selected file is not a video.");
    return;
  }

  if (videoRAF) {
    cancelAnimationFrame(videoRAF);
    videoRAF = null;
  }

  const url = URL.createObjectURL(file);
  videoEl.src = url;
  videoEl.onloadedmetadata = () => {
    loadedSource = videoEl;
    debug(`Video loaded: ${file.name} (${videoEl.videoWidth}×${videoEl.videoHeight})`);
    videoEl.play();
  };
  videoEl.onplay = () => {
    videoPlaying = true;
    videoLoop();
  };
  videoEl.onpause = () => {
    videoPlaying = false;
    if (videoRAF) cancelAnimationFrame(videoRAF);
  };
  videoEl.onended = () => {
    videoPlaying = false;
    if (videoRAF) cancelAnimationFrame(videoRAF);
  };
});

function videoLoop() {
  if (!videoPlaying || !loadedSource) return;

  const size = getSourceSize();
  if (!size || !size.w || !size.h) {
    videoRAF = requestAnimationFrame(videoLoop);
    return;
  }

  const { w, h } = size;

  originalCanvas.width = w;
  originalCanvas.height = h;
  originalCtx.drawImage(loadedSource, 0, 0, w, h);

  applyDither(methodSelect.value, modeSelect.value, true);
  videoRAF = requestAnimationFrame(videoLoop);
}

// ---------- Zoom ----------

function updateZoom() {
  const z = Number(zoomSlider.value);
  zoomVal.textContent = `${z.toFixed(1)}×`;
  ditheredCanvas.style.transformOrigin = "top left";
  ditheredCanvas.style.transform = `scale(${z})`;
}
zoomSlider.addEventListener("input", updateZoom);
updateZoom();

// ---------- Slider labels ----------

function updateSliderLabels() {
  brightnessVal.textContent = brightnessSlider.value;
  contrastVal.textContent = contrastSlider.value;
  gammaVal.textContent = gammaSlider.value;
  thresholdVal.textContent = thresholdSlider.value;
  scaleVal.textContent = scaleSlider.value;
  blackVal.textContent = blackSlider.value;
  whiteVal.textContent = whiteSlider.value;
  ditherStrengthVal.textContent = ditherStrengthSlider.value;
  glitchVal.textContent = glitchSlider.value;
}
updateSliderLabels();

function slidersChanged() {
  updateSliderLabels();
  if (loadedSource) {
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
  ditherStrengthSlider,
  glitchSlider,
  methodSelect,
  modeSelect,
  fgColorInput,
  bgColorInput,
].forEach((el) => el.addEventListener("input", slidersChanged));

// ---------- Main Dither Trigger ----------

ditherBtn.addEventListener("click", () => {
  if (!loadedSource) {
    debug("No source to dither.");
    return;
  }
  applyDither(methodSelect.value, modeSelect.value, false);
});

// ============================================================
//  Core Dithering
// ============================================================

function applyDither(method, mode, previewOnly) {
  if (!loadedSource) return;

  const size = getSourceSize();
  if (!size || !size.w || !size.h) return;
  const { w, h } = size;

  const workCanvas = document.createElement("canvas");
  workCanvas.width = w;
  workCanvas.height = h;
  const workCtx = workCanvas.getContext("2d");
  workCtx.drawImage(loadedSource, 0, 0, w, h);
  const imgData = workCtx.getImageData(0, 0, w, h);
  const src = imgData.data;

  const scalePct = Number(scaleSlider.value) / 100;
  const dw = Math.max(1, Math.floor(w * scalePct));
  const dh = Math.max(1, Math.floor(h * scalePct));

  const ditherStrength = Number(ditherStrengthSlider.value) / 100; // 0–2
  const glitchIntensity = Number(glitchSlider.value); // 0–100

  // ---------- RGB DITHER MODE ----------
  if (mode === "rgb") {
    const tinyData = ditherRGB(src, w, h, dw, dh, {
      method,
      ditherStrength,
      glitchIntensity,
    });

    finalizeOutput(tinyData, dw, dh, w, h, previewOnly, method, mode);
    return;
  }

  // ---------- Grayscale pipeline (mono / gray / palette) ----------

  // 1. grayscale (full res)
  let lum = new Float32Array(w * h);
  for (let i = 0, j = 0; i < src.length; i += 4, j++) {
    const r = src[i];
    const g = src[i + 1];
    const b = src[i + 2];
    lum[j] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // 2. downsample to dw x dh
  let lumSmall = new Float32Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const sx = Math.floor((x / dw) * w);
      const sy = Math.floor((y / dh) * h);
      lumSmall[y * dw + x] = lum[sy * w + sx];
    }
  }

  // 3. apply corrections + glitch noise
  const B = Number(brightnessSlider.value);
  const C = Number(contrastSlider.value) / 100;
  const G = Number(gammaSlider.value);
  const T = Number(thresholdSlider.value);
  const BP = Number(blackSlider.value);
  const WP = Number(whiteSlider.value);
  const range = Math.max(1, WP - BP);

  for (let i = 0; i < lumSmall.length; i++) {
    let v = lumSmall[i];

    // brightness
    v += B;
    // contrast
    v = ((v - 128) * C) + 128;
    // gamma
    v = 255 * Math.pow(v / 255, 1 / G);
    // threshold offset
    v += T;
    // levels
    v = (v - BP) * (255 / range);

    // glitch noise
    if (glitchIntensity > 0) {
      const n = (Math.random() - 0.5) * 2 * glitchIntensity;
      v += n;
    }

    lumSmall[i] = Math.min(255, Math.max(0, v));
  }

  const customThresholdBase = 128 * (255 / range);

  const fg = parseHexColor(fgColorInput.value);
  const bg = parseHexColor(bgColorInput.value);
  const usePalette = (mode === "palette");
  const tinyData = new Uint8ClampedArray(dw * dh * 4);

  function writePixelGray(i, bit) {
    const idx = i * 4;
    if (usePalette) {
      const c = bit ? fg : bg;
      tinyData[idx] = c.r;
      tinyData[idx + 1] = c.g;
      tinyData[idx + 2] = c.b;
    } else {
      const v = bit ? 255 : 0;
      tinyData[idx] = v;
      tinyData[idx + 1] = v;
      tinyData[idx + 2] = v;
    }
    tinyData[idx + 3] = 255;
  }

  if (mode === "gray") {
    for (let i = 0; i < lumSmall.length; i++) {
      const v = lumSmall[i];
      const idx = i * 4;
      tinyData[idx] = v;
      tinyData[idx + 1] = v;
      tinyData[idx + 2] = v;
      tinyData[idx + 3] = 255;
    }
  } else {
    const algo = method;
    if (algo === "ordered") {
      // Ordered Bayer (ignores ditherStrength, but still respects glitch noise)
      const bayer = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5],
      ];
      for (let y = 0; y < dh; y++) {
        for (let x = 0; x < dw; x++) {
          const i = y * dw + x;
          const L = lumSmall[i] / 255;
          const baseT = (bayer[y & 3][x & 3] + 0.5) / 16;
          const jitter =
            glitchIntensity > 0 ? ((Math.random() - 0.5) * glitchIntensity) / 200 : 0;
          const t = baseT + jitter;
          const bit = L >= t ? 1 : 0;
          writePixelGray(i, bit);
        }
      }
    } else {
      // Error-diffusion family: Floyd, Atkinson, Sierra, Burkes
      if (algo === "floyd") {
        for (let y = 0; y < dh; y++) {
          for (let x = 0; x < dw; x++) {
            const i = y * dw + x;
            const old = lumSmall[i];
            const jitter =
              glitchIntensity > 0 ? (Math.random() - 0.5) * glitchIntensity : 0;
            const threshold = customThresholdBase + jitter;
            const bit = old >= threshold ? 1 : 0;
            const newV = bit ? 255 : 0;
            writePixelGray(i, bit);

            let err = (old - newV) * ditherStrength;
            if (!Number.isFinite(err)) err = 0;

            if (x + 1 < dw) lumSmall[i + 1] += err * (7 / 16);
            if (y + 1 < dh) {
              if (x > 0) lumSmall[i + dw - 1] += err * (3 / 16);
              lumSmall[i + dw] += err * (5 / 16);
              if (x + 1 < dw) lumSmall[i + dw + 1] += err * (1 / 16);
            }
          }
        }
      } else if (algo === "atkinson") {
        for (let y = 0; y < dh; y++) {
          for (let x = 0; x < dw; x++) {
            const i = y * dw + x;
            const old = lumSmall[i];
            const jitter =
              glitchIntensity > 0 ? (Math.random() - 0.5) * glitchIntensity : 0;
            const threshold = customThresholdBase + jitter;
            const bit = old >= threshold ? 1 : 0;
            const newV = bit ? 255 : 0;
            writePixelGray(i, bit);

            let err = ((old - newV) / 8) * ditherStrength;
            if (!Number.isFinite(err)) err = 0;

            if (x + 1 < dw) lumSmall[i + 1] += err;
            if (x + 2 < dw) lumSmall[i + 2] += err;
            if (y + 1 < dh) {
              if (x > 0) lumSmall[i + dw - 1] += err;
              lumSmall[i + dw] += err;
              if (x + 1 < dw) lumSmall[i + dw + 1] += err;
            }
            if (y + 2 < dh) lumSmall[i + 2 * dw] += err;
          }
        }
      } else if (algo === "sierra") {
        for (let y = 0; y < dh; y++) {
          for (let x = 0; x < dw; x++) {
            const i = y * dw + x;
            const old = lumSmall[i];
            const jitter =
              glitchIntensity > 0 ? (Math.random() - 0.5) * glitchIntensity : 0;
            const threshold = customThresholdBase + jitter;
            const bit = old >= threshold ? 1 : 0;
            const newV = bit ? 255 : 0;
            writePixelGray(i, bit);

            let err = (old - newV) * ditherStrength;
            if (!Number.isFinite(err)) err = 0;

            if (x + 1 < dw) lumSmall[i + 1] += err * (2 / 4);
            if (y + 1 < dh) {
              if (x > 0) lumSmall[i + dw - 1] += err * (1 / 4);
              lumSmall[i + dw] += err * (1 / 4);
            }
          }
        }
      } else if (algo === "burkes") {
        const weights = [
          { dx: 1, dy: 0, w: 8 },
          { dx: 2, dy: 0, w: 4 },
          { dx: -2, dy: 1, w: 2 },
          { dx: -1, dy: 1, w: 4 },
          { dx: 0, dy: 1, w: 8 },
          { dx: 1, dy: 1, w: 4 },
          { dx: 2, dy: 1, w: 2 },
        ];
        const norm = 32;
        for (let y = 0; y < dh; y++) {
          for (let x = 0; x < dw; x++) {
            const i = y * dw + x;
            const old = lumSmall[i];
            const jitter =
              glitchIntensity > 0 ? (Math.random() - 0.5) * glitchIntensity : 0;
            const threshold = customThresholdBase + jitter;
            const bit = old >= threshold ? 1 : 0;
            const newV = bit ? 255 : 0;
            writePixelGray(i, bit);

            let err = (old - newV) * ditherStrength;
            if (!Number.isFinite(err)) err = 0;

            for (const { dx, dy, w: ww } of weights) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < dw && ny >= 0 && ny < dh) {
                lumSmall[ny * dw + nx] += err * (ww / norm);
              }
            }
          }
        }
      } else {
        // default to floyd
        debug(`Unknown method "${algo}", using Floyd.`);
      }
    }
  }

  finalizeOutput(tinyData, dw, dh, w, h, previewOnly, method, mode);
}

// ---------- RGB dithering (per-channel) ----------

function ditherRGB(src, w, h, dw, dh, opts) {
  const { method, ditherStrength, glitchIntensity } = opts;

  const rSmall = new Float32Array(dw * dh);
  const gSmall = new Float32Array(dw * dh);
  const bSmall = new Float32Array(dw * dh);

  // downsample from src
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const sx = Math.floor((x / dw) * w);
      const sy = Math.floor((y / dh) * h);
      const si = (sy * w + sx) * 4;
      const di = y * dw + x;
      rSmall[di] = src[si];
      gSmall[di] = src[si + 1];
      bSmall[di] = src[si + 2];
    }
  }

  const B = Number(brightnessSlider.value);
  const C = Number(contrastSlider.value) / 100;
  const G = Number(gammaSlider.value);
  const T = Number(thresholdSlider.value);

  function adjustChannel(arr) {
    for (let i = 0; i < arr.length; i++) {
      let v = arr[i];

      v += B;
      v = ((v - 128) * C) + 128;
      v = 255 * Math.pow(v / 255, 1 / G);
      v += T;

      if (glitchIntensity > 0) {
        const n = (Math.random() - 0.5) * 2 * glitchIntensity;
        v += n;
      }

      arr[i] = Math.min(255, Math.max(0, v));
    }
  }

  adjustChannel(rSmall);
  adjustChannel(gSmall);
  adjustChannel(bSmall);

  const tinyData = new Uint8ClampedArray(dw * dh * 4);

  if (method === "ordered") {
    const bayer = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5],
    ];
    for (let y = 0; y < dh; y++) {
      for (let x = 0; x < dw; x++) {
        const i = y * dw + x;
        const baseT = (bayer[y & 3][x & 3] + 0.5) / 16;
        const jitter =
          glitchIntensity > 0 ? ((Math.random() - 0.5) * glitchIntensity) / 200 : 0;
        const t = (baseT + jitter) * 255;

        const rBit = rSmall[i] >= t ? 255 : 0;
        const gBit = gSmall[i] >= t ? 255 : 0;
        const bBit = bSmall[i] >= t ? 255 : 0;

        const idx = i * 4;
        tinyData[idx] = rBit;
        tinyData[idx + 1] = gBit;
        tinyData[idx + 2] = bBit;
        tinyData[idx + 3] = 255;
      }
    }
  } else {
    // Floyd-style RGB error diffusion
    for (let y = 0; y < dh; y++) {
      for (let x = 0; x < dw; x++) {
        const i = y * dw + x;

        const threshold = 128; // fixed for RGB

        const oldR = rSmall[i];
        const oldG = gSmall[i];
        const oldB = bSmall[i];

        const rNew = oldR >= threshold ? 255 : 0;
        const gNew = oldG >= threshold ? 255 : 0;
        const bNew = oldB >= threshold ? 255 : 0;

        const idx = i * 4;
        tinyData[idx] = rNew;
        tinyData[idx + 1] = gNew;
        tinyData[idx + 2] = bNew;
        tinyData[idx + 3] = 255;

        let errR = (oldR - rNew) * ditherStrength;
        let errG = (oldG - gNew) * ditherStrength;
        let errB = (oldB - bNew) * ditherStrength;

        if (!Number.isFinite(errR)) errR = 0;
        if (!Number.isFinite(errG)) errG = 0;
        if (!Number.isFinite(errB)) errB = 0;

        function addErr(xoff, yoff, factor) {
          const nx = x + xoff;
          const ny = y + yoff;
          if (nx < 0 || nx >= dw || ny < 0 || ny >= dh) return;
          const n = ny * dw + nx;
          rSmall[n] += errR * factor;
          gSmall[n] += errG * factor;
          bSmall[n] += errB * factor;
        }

        // classic Floyd kernel
        addErr(1, 0, 7 / 16);
        addErr(-1, 1, 3 / 16);
        addErr(0, 1, 5 / 16);
        addErr(1, 1, 1 / 16);
      }
    }
  }

  return tinyData;
}

// ---------- Finalize output ----------

function finalizeOutput(
  tinyData,
  dw,
  dh,
  fullW,
  fullH,
  previewOnly,
  method,
  mode
) {
  const tinyCanvas = document.createElement("canvas");
  tinyCanvas.width = dw;
  tinyCanvas.height = dh;
  const tinyCtx = tinyCanvas.getContext("2d");
  tinyCtx.putImageData(new ImageData(tinyData, dw, dh), 0, 0);

  ditheredCanvas.width = fullW;
  ditheredCanvas.height = fullH;
  ditheredCtx.imageSmoothingEnabled = false;
  ditheredCtx.clearRect(0, 0, fullW, fullH);
  ditheredCtx.drawImage(tinyCanvas, 0, 0, dw, dh, 0, 0, fullW, fullH);

  // preview
  const s = Math.min(1, 260 / fullW, 260 / fullH);
  const pw = Math.max(1, Math.floor(fullW * s));
  const ph = Math.max(1, Math.floor(fullH * s));
  previewCanvas.width = pw;
  previewCanvas.height = ph;
  previewCtx.imageSmoothingEnabled = false;
  previewCtx.clearRect(0, 0, pw, ph);
  previewCtx.drawImage(ditheredCanvas, 0, 0, fullW, fullH, 0, 0, pw, ph);

  if (!previewOnly) {
    debug(`Dither applied: method=${method}, mode=${mode}, dw=${dw}×${dh}`);
  }

  downloadBtn.disabled = false;
}

// ---------- Download ----------

downloadBtn.addEventListener("click", () => {
  if (downloadBtn.disabled) return;
  const link = document.createElement("a");
  link.download = "dithered.png";
  link.href = ditheredCanvas.toDataURL("image/png");
  link.click();
  debug("Saved dithered.png");
});
