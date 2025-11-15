// ============================================================
//  Image Dither Lab (Advanced Version)
//  Fixed: Black/White point + dynamic threshold
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

// Labels
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

let loadedImage = null;

// Logging
function debug(msg) {
    const time = new Date().toLocaleTimeString();
    if (debugLog.textContent === "(No logs yet)") {
        debugLog.textContent = `[${time}] ${msg}\n`;
    } else {
        debugLog.textContent += `[${time}] ${msg}\n`;
    }
    debugLog.scrollTop = debugLog.scrollHeight;
}

// Parse "#rrggbb"
function parseHexColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

// ------------------------------------------------------------
// Load Image from file or drop
// ------------------------------------------------------------
imageInput.addEventListener("change", e => {
    if (e.target.files.length) handleFileDrop(e.target.files[0]);
});

document.addEventListener("dragover", e => e.preventDefault());
document.addEventListener("drop", e => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFileDrop(e.dataTransfer.files[0]);
});

function handleFileDrop(file) {
    if (!file.type.startsWith("image/")) return debug("Not an image.");
    const reader = new FileReader();
    reader.onload = ev => {
        const img = new Image();
        img.onload = () => loadImage(img, file.name);
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}

function loadImage(img, name) {
    loadedImage = img;

    originalCanvas.width = img.width;
    originalCanvas.height = img.height;

    ditheredCanvas.width = img.width;
    ditheredCanvas.height = img.height;

    originalCtx.drawImage(img, 0, 0);

    const s = Math.min(1, 260 / img.width, 260 / img.height);
    previewCanvas.width = Math.floor(img.width * s);
    previewCanvas.height = Math.floor(img.height * s);

    debug(`Loaded image: ${name} (${img.width}×${img.height})`);
    applyDither(methodSelect.value, modeSelect.value, true);
}

// ------------------------------------------------------------
// Zoom
// ------------------------------------------------------------
zoomSlider.addEventListener("input", () => {
    const z = Number(zoomSlider.value);
    zoomVal.textContent = `${z}×`;
    ditheredCanvas.style.transform = `scale(${z})`;
});
zoomSlider.dispatchEvent(new Event("input"));

// ------------------------------------------------------------
// Slider updates
// ------------------------------------------------------------
function updateSliderLabels() {
    brightnessVal.textContent = brightnessSlider.value;
    contrastVal.textContent = contrastSlider.value;
    gammaVal.textContent = gammaSlider.value;
    thresholdVal.textContent = thresholdSlider.value;
    scaleVal.textContent = scaleSlider.value;
    blackVal.textContent = blackSlider.value;
    whiteVal.textContent = whiteSlider.value;
}

function sliderChanged() {
    updateSliderLabels();
    if (loadedImage) applyDither(methodSelect.value, modeSelect.value, true);
}

[
    brightnessSlider, contrastSlider, gammaSlider,
    thresholdSlider, scaleSlider, blackSlider, whiteSlider,
    methodSelect, modeSelect, fgColorInput, bgColorInput
].forEach(el => el.addEventListener("input", sliderChanged));

updateSliderLabels();

// ------------------------------------------------------------
// Dithering Pipeline
// ------------------------------------------------------------
ditherBtn.addEventListener("click", () => {
    if (!loadedImage) return;
    applyDither(methodSelect.value, modeSelect.value, false);
});

function applyDither(method, mode, previewOnly) {
    if (!loadedImage) return;

    const w = loadedImage.width, h = loadedImage.height;
    const workCanvas = document.createElement("canvas");
    workCanvas.width = w; workCanvas.height = h;
    const workCtx = workCanvas.getContext("2d");
    workCtx.drawImage(loadedImage, 0, 0);

    const imgData = workCtx.getImageData(0, 0, w, h);
    const src = imgData.data;

    // Grayscale buffer
    let lum = new Float32Array(w * h);
    for (let i = 0, j = 0; i < src.length; i += 4, j++) {
        lum[j] = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
    }

    // Downsample
    const scalePct = Number(scaleSlider.value) / 100;
    const dw = Math.max(1, Math.floor(w * scalePct));
    const dh = Math.max(1, Math.floor(h * scalePct));

    let lumSmall = new Float32Array(dw * dh);
    for (let y = 0; y < dh; y++)
        for (let x = 0; x < dw; x++)
            lumSmall[y * dw + x] = lum[Math.floor((y / dh) * h) * w + Math.floor((x / dw) * w)];

    // Pre-correction sliders
    let B = Number(brightnessSlider.value);
    let C = Number(contrastSlider.value) / 100;
    let G = Number(gammaSlider.value);
    let T = Number(thresholdSlider.value);

    // Black/White points
    let BP = Number(blackSlider.value);
    let WP = Number(whiteSlider.value);
    let range = Math.max(1, WP - BP);

    for (let i = 0; i < lumSmall.length; i++) {
        let v = lumSmall[i];

        v += B;
        v = ((v - 128) * C) + 128;
        v = 255 * Math.pow(v / 255, 1 / G);
        v += T;

        // REAL WORKING LEVELS FIX
        v = (v - BP) * (255 / range);

        lumSmall[i] = Math.min(255, Math.max(0, v));
    }

    // Dynamic threshold (REAL FIX)
    const customThreshold = 128 * (255 / range);

    // Output small buffer
    let tinyData = new Uint8ClampedArray(dw * dh * 4);

    // Palette
    const fg = parseHexColor(fgColorInput.value);
    const bg = parseHexColor(bgColorInput.value);
    const usePalette = (mode === "palette");

    function writePixelTiny(i, bit) {
        const p = i * 4;
        if (usePalette) {
            const col = bit ? fg : bg;
            tinyData[p] = col.r;
            tinyData[p + 1] = col.g;
            tinyData[p + 2] = col.b;
        } else {
            const v = bit ? 255 : 0;
            tinyData[p] = tinyData[p + 1] = tinyData[p + 2] = v;
        }
        tinyData[p + 3] = 255;
    }

    if (mode === "gray") {
        for (let i = 0; i < lumSmall.length; i++) {
            const v = lumSmall[i];
            const p = i * 4;
            tinyData[p] = tinyData[p + 1] = tinyData[p + 2] = v;
            tinyData[p + 3] = 255;
        }
    } else {
        // -----------------------------
        //   DITHERING ALGORITHMS
        // -----------------------------

        if (method === "ordered") ordered();
        else if (method === "atkinson") atkinson();
        else if (method === "sierra") sierraLite();
        else if (method === "burkes") burkes();
        else floyd(); // default

        function floyd() {
            for (let y = 0; y < dh; y++) {
                for (let x = 0; x < dw; x++) {
                    const i = y * dw + x;
                    const old = lumSmall[i];
                    const bit = old >= customThreshold ? 1 : 0;
                    const newv = bit ? 255 : 0;
                    writePixelTiny(i, bit);

                    const err = old - newv;

                    if (x + 1 < dw) lumSmall[i + 1] += err * 7 / 16;
                    if (y + 1 < dh) {
                        if (x > 0) lumSmall[i + dw - 1] += err * 3 / 16;
                        lumSmall[i + dw] += err * 5 / 16;
                        if (x + 1 < dw) lumSmall[i + dw + 1] += err * 1 / 16;
                    }
                }
            }
        }

        function ordered() {
            const bayer = [
                [0, 8, 2, 10],
                [12, 4, 14, 6],
                [3, 11, 1, 9],
                [15, 7, 13, 5]
            ];
            for (let y = 0; y < dh; y++) {
                for (let x = 0; x < dw; x++) {
                    const i = y * dw + x;
                    const L = lumSmall[i] / 255;
                    const t = (bayer[y & 3][x & 3] + 0.5) / 16;
                    const bit = L >= t ? 1 : 0;
                    writePixelTiny(i, bit);
                }
            }
        }

        function atkinson() {
            for (let y = 0; y < dh; y++) {
                for (let x = 0; x < dw; x++) {
                    const i = y * dw + x;
                    const old = lumSmall[i];
                    const bit = old >= customThreshold ? 1 : 0;
                    const newv = bit ? 255 : 0;
                    writePixelTiny(i, bit);

                    const err = (old - newv) / 8;

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
        }

        function sierraLite() {
            for (let y = 0; y < dh; y++) {
                for (let x = 0; x < dw; x++) {
                    const i = y * dw + x;
                    const old = lumSmall[i];
                    const bit = old >= customThreshold ? 1 : 0;
                    const newv = bit ? 255 : 0;
                    writePixelTiny(i, bit);

                    const err = old - newv;

                    if (x + 1 < dw) lumSmall[i + 1] += err * 2 / 4;
                    if (y + 1 < dh) {
                        if (x > 0) lumSmall[i + dw - 1] += err * 1 / 4;
                        lumSmall[i + dw] += err * 1 / 4;
                    }
                }
            }
        }

        function burkes() {
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

            for (let y = 0; y < dh; y++) {
                for (let x = 0; x < dw; x++) {
                    const i = y * dw + x;
                    const old = lumSmall[i];
                    const bit = old >= customThreshold ? 1 : 0;
                    const newv = bit ? 255 : 0;
                    writePixelTiny(i, bit);

                    const err = old - newv;

                    for (const { dx, dy, w: ww } of weights) {
                        const nx = x + dx, ny = y + dy;
                        if (nx >= 0 && nx < dw && ny >= 0 && ny < dh)
                            lumSmall[ny * dw + nx] += err * (ww / norm);
                    }
                }
            }
        }
    }

    // -----------------------------
    // Final upscale to full canvas
    // -----------------------------
    const tinyCanvas = document.createElement("canvas");
    tinyCanvas.width = dw;
    tinyCanvas.height = dh;
    tinyCanvas.getContext("2d").putImageData(new ImageData(tinyData, dw, dh), 0, 0);

    ditheredCanvas.width = w;
    ditheredCanvas.height = h;
    ditheredCtx.imageSmoothingEnabled = false;
    ditheredCtx.drawImage(tinyCanvas, 0, 0, dw, dh, 0, 0, w, h);

    // Preview
    const s = Math.min(1, 260 / w, 260 / h);
    const pw = Math.floor(w * s);
    const ph = Math.floor(h * s);
    previewCanvas.width = pw;
    previewCanvas.height = ph;

    previewCtx.imageSmoothingEnabled = false;
    previewCtx.drawImage(ditheredCanvas, 0, 0, w, h, 0, 0, pw, ph);

    if (!previewOnly) debug(`Dither applied: ${method}, ${mode}.`);
    downloadBtn.disabled = false;
}

// ------------------------------------------------------------
// Download
// ------------------------------------------------------------
downloadBtn.addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = "dithered.png";
    link.href = ditheredCanvas.toDataURL("image/png");
    link.click();
    debug("Saved dithered.png");
});
