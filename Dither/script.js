// ============================================================
//  Image Dither App - Full JS (with Ditherboy-style controls)
// ============================================================

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

// Sliders
const brightness = document.getElementById("brightness");
const contrast = document.getElementById("contrast");
const gamma = document.getElementById("gamma");
const threshold = document.getElementById("threshold");
const scale = document.getElementById("scale");

const brightnessVal = document.getElementById("brightnessVal");
const contrastVal = document.getElementById("contrastVal");
const gammaVal = document.getElementById("gammaVal");
const thresholdVal = document.getElementById("thresholdVal");
const scaleVal = document.getElementById("scaleVal");

// Loaded image object
let loadedImage = null;

// Debug logger
function debug(msg) {
    const time = new Date().toLocaleTimeString();
    debugLog.textContent += `[${time}] ${msg}\n`;
    debugLog.scrollTop = debugLog.scrollHeight;
}

// ============================================================
// Load Image
// ============================================================
imageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            loadedImage = img;

            originalCanvas.width = img.width;
            originalCanvas.height = img.height;
            ditheredCanvas.width = img.width;
            ditheredCanvas.height = img.height;

            originalCtx.drawImage(img, 0, 0);
            debug(`Loaded image ${img.width}x${img.height}`);
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
});

// ============================================================
// Slider → Live-update
// ============================================================
function refreshSliders() {
    brightnessVal.textContent = brightness.value;
    contrastVal.textContent = contrast.value;
    gammaVal.textContent = gamma.value;
    thresholdVal.textContent = threshold.value;
    scaleVal.textContent = scale.value;

    if (loadedImage) applyDither(methodSelect.value, modeSelect.value);
}

brightness.oninput =
    contrast.oninput =
        gamma.oninput =
            threshold.oninput =
                scale.oninput = refreshSliders;

// ============================================================
// Apply Dithering
// ============================================================
ditherBtn.addEventListener("click", () => {
    if (!loadedImage) return debug("No image loaded.");
    applyDither(methodSelect.value, modeSelect.value);
});

function applyDither(method, mode) {

    const w = originalCanvas.width;
    const h = originalCanvas.height;

    let imageData = originalCtx.getImageData(0, 0, w, h);
    let src = imageData.data;

    // Step 1: Convert to grayscale luminance
    let lum = new Float32Array(w * h);

    for (let i = 0, j = 0; i < src.length; i += 4, j++) {
        const r = src[i];
        const g = src[i + 1];
        const b = src[i + 2];
        lum[j] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // Step 2: Downscale (Ditherboy pixelation)
    const scalePct = Number(scale.value) / 100;
    const tw = Math.floor(w * scalePct);
    const th = Math.floor(h * scalePct);

    let lumSmall = new Float32Array(tw * th);

    for (let y = 0; y < th; y++) {
        for (let x = 0; x < tw; x++) {
            const sx = Math.floor((x / tw) * w);
            const sy = Math.floor((y / th) * h);
            lumSmall[y * tw + x] = lum[sy * w + sx];
        }
    }

    // Step 3: Apply brightness, contrast, gamma, threshold offset
    let B = Number(brightness.value);
    let C = Number(contrast.value) / 100;
    let G = Number(gamma.value);
    let T = Number(threshold.value);

    for (let i = 0; i < lumSmall.length; i++) {
        let v = lumSmall[i];

        v += B;                   // brightness
        v = ((v - 128) * C) + 128;  // contrast
        v = 255 * Math.pow(v / 255, 1 / G); // gamma
        v += T;                    // threshold offset

        lumSmall[i] = Math.min(255, Math.max(0, v));
    }

    // Step 4: Create output buffer for tiny canvas
    let tinyData = new Uint8ClampedArray(tw * th * 4);

    if (mode === "gray") {
        // No dithering
        for (let i = 0; i < lumSmall.length; i++) {
            const v = lumSmall[i];
            const p = i * 4;
            tinyData[p] = v;
            tinyData[p + 1] = v;
            tinyData[p + 2] = v;
            tinyData[p + 3] = 255;
        }
    } else {
        // Apply chosen dithering method
        if (method === "floyd") dither_floyd(lumSmall, tinyData, tw, th);
        else dither_ordered(lumSmall, tinyData, tw, th);
    }

    // Step 5: Draw tiny dithered canvas
    let tinyCanvas = document.createElement("canvas");
    tinyCanvas.width = tw;
    tinyCanvas.height = th;
    let tinyCtx = tinyCanvas.getContext("2d", { willReadFrequently: true });
    tinyCtx.putImageData(new ImageData(tinyData, tw, th), 0, 0);

    // Step 6: Upscale to full-size canvas
    ditheredCtx.imageSmoothingEnabled = false;
    ditheredCtx.clearRect(0, 0, w, h);
    ditheredCtx.drawImage(tinyCanvas, 0, 0, tw, th, 0, 0, w, h);

    downloadBtn.disabled = false;
    debug("Dithering complete.");
}

// ============================================================
// Floyd–Steinberg Dither
// ============================================================
function dither_floyd(lum, out, w, h) {
    const threshold = 128;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {

            const i = y * w + x;
            const old = lum[i];
            const newv = old < threshold ? 0 : 255;
            const err = old - newv;

            const p = i * 4;
            out[p] = out[p + 1] = out[p + 2] = newv;
            out[p + 3] = 255;

            // Spread error
            if (x + 1 < w) lum[i + 1] += err * 7 / 16;
            if (y + 1 < h) {
                if (x > 0) lum[i + w - 1] += err * 3 / 16;
                lum[i + w] += err * 5 / 16;
                if (x + 1 < w) lum[i + w + 1] += err * 1 / 16;
            }
        }
    }
}

// ============================================================
// Ordered Dither (4x4 Bayer)
// ============================================================
function dither_ordered(lum, out, w, h) {
    const bayer = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5]
    ];

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {

            let L = lum[y * w + x] / 255;
            let threshold = (bayer[y & 3][x & 3] + 0.5) / 16;
            let v = L < threshold ? 0 : 255;

            let p = (y * w + x) * 4;
            out[p] = out[p + 1] = out[p + 2] = v;
            out[p + 3] = 255;
        }
    }
}

// ============================================================
// Download TIFF
// ============================================================
downloadBtn.addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = "dithered.png";
    link.href = ditheredCanvas.toDataURL("image/png");
    link.click();
    debug("Saved as dithered.png");
});
