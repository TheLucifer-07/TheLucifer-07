import { createCanvas, loadImage } from "@napi-rs/canvas";
import { access } from "node:fs/promises";
import path from "node:path";

export const STYLES = Object.freeze([
  "characters",
  "dots",
  "braille",
  "mosaic",
  "pixel",
  "cross",
  "diamond",
  "mixed",
  "lines",
  "diagonal",
  "rings",
  "stars",
  "hexagons",
  "triangles",
  "halfblocks",
]);

export const DEFAULT_OPTIONS = Object.freeze({
  width: 1280,
  height: 720,
  cellSize: 10,
  density: 1,
  coverage: 0.92,
  brightness: 0,
  contrast: 1.15,
  saturation: 0,
  grayscale: true,
  invert: false,
  edgeEmphasis: 0,
  background: "#000000",
  backgroundOpacity: 1,
  blur: 0,
  tint: "#f2f2f2",
  bloom: 0,
  vignette: 0,
  chromaticAberration: 0,
  filmGrain: 0,
  scanlines: 0,
  glitch: 0,
  lighting: 0,
  style: "characters",
  ramp: " .:-=+*#%@",
  seed: 7,
  fit: "cover",
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const luminance = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function colorFromHex(value) {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new TypeError("Expected a six-digit hex color such as #f2f2f2.");
  }
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
}

export function normalizeOptions(options = {}) {
  const result = { ...DEFAULT_OPTIONS, ...options };
  const integerRanges = {
    width: [64, 4096],
    height: [64, 4096],
    cellSize: [3, 64],
    seed: [0, 2147483647],
  };
  for (const [key, range] of Object.entries(integerRanges)) {
    const value = Number(result[key]);
    if (!Number.isInteger(value) || value < range[0] || value > range[1]) {
      throw new RangeError(key + " must be an integer from " + range[0] + " to " + range[1] + ".");
    }
    result[key] = value;
  }
  const numericRanges = {
    density: [0.1, 2.5],
    coverage: [0.05, 1],
    brightness: [-1, 1],
    contrast: [0, 3],
    saturation: [0, 2],
    edgeEmphasis: [0, 1],
    backgroundOpacity: [0, 1],
    blur: [0, 20],
    bloom: [0, 1],
    vignette: [0, 1],
    chromaticAberration: [0, 20],
    filmGrain: [0, 1],
    scanlines: [0, 1],
    glitch: [0, 1],
    lighting: [0, 1],
  };
  for (const [key, range] of Object.entries(numericRanges)) {
    const value = Number(result[key]);
    if (!Number.isFinite(value) || value < range[0] || value > range[1]) {
      throw new RangeError(key + " must be from " + range[0] + " to " + range[1] + ".");
    }
    result[key] = value;
  }
  if (!STYLES.includes(result.style)) {
    throw new RangeError("Unknown style \"" + result.style + "\". Choose: " + STYLES.join(", ") + ".");
  }
  if (result.fit !== "cover" && result.fit !== "contain") {
    throw new RangeError("fit must be cover or contain.");
  }
  if (typeof result.ramp !== "string" || result.ramp.length < 2) {
    throw new TypeError("ramp must contain at least two characters.");
  }
  colorFromHex(result.background);
  colorFromHex(result.tint);
  result.grayscale = Boolean(result.grayscale);
  result.invert = Boolean(result.invert);
  return result;
}

export async function loadImageSource(inputPath) {
  if (!inputPath) {
    throw new Error("No image path was provided.");
  }
  const resolvedPath = path.resolve(inputPath);
  try {
    await access(resolvedPath);
  } catch {
    throw new Error("Image not found: " + resolvedPath);
  }
  try {
    return await loadImage(resolvedPath);
  } catch (error) {
    throw new Error("Could not decode image " + resolvedPath + ": " + error.message);
  }
}

function drawFittedImage(context, image, width, height, fit, blur) {
  const imageWidth = image.width;
  const imageHeight = image.height;
  if (!imageWidth || !imageHeight) {
    throw new Error("The source image has no readable dimensions.");
  }
  // Cover fills the frame by cropping excess; contain preserves the full image.
  const scale = fit === "cover"
    ? Math.max(width / imageWidth, height / imageHeight)
    : Math.min(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;
  context.filter = blur > 0 ? "blur(" + blur + "px)" : "none";
  context.drawImage(image, x, y, drawWidth, drawHeight);
  context.filter = "none";
}

function seededValue(x, y, seed) {
  // Coordinate hashing keeps grain and glitches stable across repeat renders.
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function sampleChannel(data, imageWidth, imageHeight, x, y, channel) {
  const sx = clamp(Math.round(x), 0, imageWidth - 1);
  const sy = clamp(Math.round(y), 0, imageHeight - 1);
  return data[(sy * imageWidth + sx) * 4 + channel];
}

function sampleCell(data, width, height, x0, y0, x1, y1, chromaticShift) {
  let red = 0;
  let green = 0;
  let blue = 0;
  let top = 0;
  let bottom = 0;
  let topCount = 0;
  let bottomCount = 0;
  const centerY = (y0 + y1) / 2;
  // Stratified samples approximate a cell average while bounding work for large cells.
  const step = Math.max(1, Math.floor(Math.sqrt(((x1 - x0) * (y1 - y0)) / 160)));
  let count = 0;
  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      red += sampleChannel(data, width, height, x + chromaticShift, y, 0);
      green += sampleChannel(data, width, height, x, y, 1);
      blue += sampleChannel(data, width, height, x - chromaticShift, y, 2);
      const pixelLum = luminance(
        sampleChannel(data, width, height, x, y, 0),
        sampleChannel(data, width, height, x, y, 1),
        sampleChannel(data, width, height, x, y, 2),
      );
      if (y < centerY) {
        top += pixelLum;
        topCount += 1;
      } else {
        bottom += pixelLum;
        bottomCount += 1;
      }
      count += 1;
    }
  }
  if (!count) return { r: 0, g: 0, b: 0, lum: 0, topLum: 0, bottomLum: 0 };
  const r = red / count;
  const g = green / count;
  const b = blue / count;
  return {
    r,
    g,
    b,
    lum: luminance(r, g, b),
    topLum: topCount ? top / topCount : 0,
    bottomLum: bottomCount ? bottom / bottomCount : 0,
  };
}

function adjustCell(cell, options, x, y, cols, rows) {
  let r = cell.r;
  let g = cell.g;
  let b = cell.b;
  const sourceLum = luminance(r, g, b);
  const sat = options.saturation;
  r = sourceLum + (r - sourceLum) * sat;
  g = sourceLum + (g - sourceLum) * sat;
  b = sourceLum + (b - sourceLum) * sat;
  if (options.grayscale) {
    r = g = b = luminance(r, g, b);
  }
  const brightnessOffset = options.brightness * 255;
  const contrast = options.contrast;
  r = (r - 128) * contrast + 128 + brightnessOffset;
  g = (g - 128) * contrast + 128 + brightnessOffset;
  b = (b - 128) * contrast + 128 + brightnessOffset;
  let lum = luminance(r, g, b);
  if (options.invert) lum = 255 - lum;
  const tint = colorFromHex(options.tint);
  if (options.grayscale || options.tint !== DEFAULT_OPTIONS.tint) {
    r = tint[0] * lum / 255;
    g = tint[1] * lum / 255;
    b = tint[2] * lum / 255;
  }
  const dx = (x / Math.max(1, cols - 1)) - 0.28;
  const dy = (y / Math.max(1, rows - 1)) - 0.22;
  const light = 1 + options.lighting * (0.25 - Math.sqrt(dx * dx + dy * dy) * 0.22);
  const grain = (seededValue(x, y, options.seed) - 0.5) * options.filmGrain * 70;
  lum = clamp(lum * light + grain, 0, 255);
  if (sourceLum < 9) lum = 0;
  const scale = lum / Math.max(1, luminance(r, g, b));
  return {
    r: clamp(r * scale, 0, 255),
    g: clamp(g * scale, 0, 255),
    b: clamp(b * scale, 0, 255),
    lum,
    topLum: cell.topLum,
    bottomLum: cell.bottomLum,
  };
}

function cellColor(cell, options, multiplier = 1) {
  const factor = clamp(multiplier, 0, 1);
  return "rgb(" + Math.round(cell.r * factor) + "," + Math.round(cell.g * factor) + "," + Math.round(cell.b * factor) + ")";
}

function polygon(context, points, color, stroke = false) {
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index][0], points[index][1]);
  }
  context.closePath();
  if (stroke) context.strokeStyle = color;
  else context.fillStyle = color;
  if (stroke) context.stroke();
  else context.fill();
}

function drawStar(context, cx, cy, outerRadius, color) {
  const points = [];
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : outerRadius * 0.42;
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  polygon(context, points, color);
}

function drawGlyph(context, char, x, y, width, height, fontSize, color) {
  if (char === " ") return;
  context.font = fontSize + "px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = color;
  context.fillText(char, x + width / 2, y + height / 2 + fontSize * 0.03);
}

function drawShape(context, style, cell, x, y, width, height, options, column, row) {
  const normalized = clamp(cell.lum / 255, 0, 1);
  const level = Math.pow(normalized, 1 / options.density);
  if (level < 0.035) return;
  const size = Math.min(width, height) * options.coverage * (0.28 + level * 0.72);
  const cx = x + width / 2;
  const cy = y + height / 2;
  const color = cellColor(cell, options);
  const radius = size / 2;
  const styles = style === "mixed"
    ? ["characters", "dots", "cross", "diamond"][(Math.floor(seededValue(column, row, options.seed) * 4))]
    : style;
  context.save();
  context.globalAlpha = options.backgroundOpacity === 0 ? 1 : 0.96;
  if (options.bloom > 0) {
    context.shadowColor = color;
    context.shadowBlur = options.bloom * 8;
  }
  if (styles === "characters") {
    const index = clamp(Math.floor(level * (options.ramp.length - 1)), 0, options.ramp.length - 1);
    drawGlyph(context, options.ramp[index], x, y, width, height, Math.max(5, height * options.coverage), color);
  } else if (styles === "dots") {
    context.beginPath();
    context.arc(cx, cy, Math.max(0.6, radius), 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
  } else if (styles === "mosaic" || styles === "pixel") {
    const blockSize = styles === "pixel" ? Math.min(width, height) * options.coverage : size;
    context.fillStyle = color;
    context.fillRect(cx - blockSize / 2, cy - blockSize / 2, blockSize, blockSize);
  } else if (styles === "cross") {
    context.strokeStyle = color;
    context.lineWidth = Math.max(1, Math.min(width, height) * 0.09 * level);
    context.beginPath();
    context.moveTo(cx - radius, cy);
    context.lineTo(cx + radius, cy);
    context.moveTo(cx, cy - radius);
    context.lineTo(cx, cy + radius);
    context.stroke();
  } else if (styles === "diamond") {
    polygon(context, [[cx, cy - radius], [cx + radius, cy], [cx, cy + radius], [cx - radius, cy]], color);
  } else if (styles === "lines" || styles === "diagonal") {
    context.strokeStyle = color;
    context.lineWidth = Math.max(0.7, height * 0.055 * level);
    const lineCount = Math.max(1, Math.ceil(level * options.density * 4));
    for (let index = 0; index < lineCount; index += 1) {
      const offset = ((index + 1) / (lineCount + 1) - 0.5) * size;
      context.beginPath();
      if (styles === "lines") {
        context.moveTo(cx - radius, cy + offset);
        context.lineTo(cx + radius, cy + offset);
      } else {
        context.moveTo(cx - radius, cy + offset + radius * 0.35);
        context.lineTo(cx + radius, cy + offset - radius * 0.35);
      }
      context.stroke();
    }
  } else if (styles === "rings") {
    const count = Math.max(1, Math.ceil(level * options.density * 3));
    context.strokeStyle = color;
    context.lineWidth = Math.max(0.7, height * 0.045);
    for (let index = 0; index < count; index += 1) {
      const ring = radius * (index + 1) / count;
      context.beginPath();
      context.arc(cx, cy, ring, 0, Math.PI * 2);
      context.stroke();
    }
  } else if (styles === "stars") {
    drawStar(context, cx, cy, radius, color);
  } else if (styles === "hexagons") {
    const points = [];
    for (let index = 0; index < 6; index += 1) {
      const angle = Math.PI / 3 * index;
      points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
    }
    polygon(context, points, color);
  } else if (styles === "triangles") {
    polygon(context, [[cx, cy - radius], [cx + radius, cy + radius], [cx - radius, cy + radius]], color);
  } else if (styles === "halfblocks") {
    const topLevel = Math.pow(clamp(cell.topLum / 255, 0, 1), 1 / options.density);
    const bottomLevel = Math.pow(clamp(cell.bottomLum / 255, 0, 1), 1 / options.density);
    const halfWidth = width * options.coverage;
    const halfHeight = height * 0.49 * options.coverage;
    if (topLevel > 0.035) {
      context.fillStyle = cellColor(cell, options, cell.lum ? cell.topLum / cell.lum : 0);
      context.fillRect(cx - halfWidth / 2, cy - halfHeight, halfWidth, halfHeight);
    }
    if (bottomLevel > 0.035) {
      context.fillStyle = cellColor(cell, options, cell.lum ? cell.bottomLum / cell.lum : 0);
      context.fillRect(cx - halfWidth / 2, cy, halfWidth, halfHeight);
    }
  } else if (styles === "braille") {
    const dots = cell.dots || [];
    // Braille dots use a nonsequential bit order: columns map to dot pairs 1/4, 2/5, 3/6, 7/8.
    const brailleBits = [0, 3, 1, 4, 2, 5, 6, 7];
    let codePoint = 0x2800;
    for (let index = 0; index < dots.length; index += 1) {
      if (dots[index] / 255 > 0.35) codePoint += 1 << brailleBits[index];
    }
    drawGlyph(context, String.fromCharCode(codePoint), x, y, width, height, Math.max(5, height * options.coverage), color);
  }
  context.restore();
}

function sampleBrailleDots(data, width, height, x0, y0, x1, y1) {
  const values = [];
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 2; column += 1) {
      const x = x0 + (column + 0.5) * (x1 - x0) / 2;
      const y = y0 + (row + 0.5) * (y1 - y0) / 4;
      values.push(luminance(
        sampleChannel(data, width, height, x, y, 0),
        sampleChannel(data, width, height, x, y, 1),
        sampleChannel(data, width, height, x, y, 2),
      ));
    }
  }
  return values;
}

function applyEdgeEmphasis(cells, options) {
  if (options.edgeEmphasis <= 0) return;
  // A 3x3 Sobel gradient boosts cell edges before the chosen primitive is drawn.
  const rows = cells.length;
  const cols = cells[0]?.length || 0;
  const source = cells.map((row) => row.map((cell) => cell.lum));
  for (let row = 1; row < rows - 1; row += 1) {
    for (let column = 1; column < cols - 1; column += 1) {
      const gx = -source[row - 1][column - 1] + source[row - 1][column + 1]
        - 2 * source[row][column - 1] + 2 * source[row][column + 1]
        - source[row + 1][column - 1] + source[row + 1][column + 1];
      const gy = -source[row - 1][column - 1] - 2 * source[row - 1][column] - source[row - 1][column + 1]
        + source[row + 1][column - 1] + 2 * source[row + 1][column] + source[row + 1][column + 1];
      const edge = Math.sqrt(gx * gx + gy * gy) / 4;
      const cell = cells[row][column];
      const previousLuminance = cell.lum;
      cell.lum = clamp(previousLuminance + edge * options.edgeEmphasis, 0, 255);
      const ratio = cell.lum / Math.max(1, previousLuminance);
      cell.r = clamp(cell.r * ratio, 0, 255);
      cell.g = clamp(cell.g * ratio, 0, 255);
      cell.b = clamp(cell.b * ratio, 0, 255);
    }
  }
}

function paintPostProcessing(context, width, height, options) {
  if (options.scanlines > 0) {
    context.save();
    context.fillStyle = "rgba(0,0,0," + (options.scanlines * 0.22) + ")";
    for (let y = 1; y < height; y += 4) context.fillRect(0, y, width, 1);
    context.restore();
  }
  if (options.vignette > 0) {
    context.save();
    const gradient = context.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.16,
      width / 2, height / 2, Math.max(width, height) * 0.68,
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0," + (options.vignette * 0.82) + ")");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.restore();
  }
}

export async function renderImage(source, suppliedOptions = {}) {
  const options = normalizeOptions(suppliedOptions);
  const sourceCanvas = createCanvas(options.width, options.height);
  const sourceContext = sourceCanvas.getContext("2d");
  sourceContext.fillStyle = options.background;
  sourceContext.fillRect(0, 0, options.width, options.height);
  drawFittedImage(sourceContext, source, options.width, options.height, options.fit, options.blur);

  const sourcePixels = sourceContext.getImageData(0, 0, options.width, options.height).data;
  const cellWidth = options.cellSize;
  const cellHeight = options.cellSize * 1.4;
  const columns = Math.ceil(options.width / cellWidth);
  const rows = Math.ceil(options.height / cellHeight);
  const cells = [];
  const glitchMax = Math.round(options.glitch * options.width * 0.06);
  const chromaticShift = options.chromaticAberration;
  for (let row = 0; row < rows; row += 1) {
    const y0 = Math.floor(row * cellHeight);
    const y1 = Math.min(options.height, Math.ceil((row + 1) * cellHeight));
    const glitchOffset = seededValue(row, options.seed, options.seed + 1) < options.glitch
      ? Math.round((seededValue(row + 1, options.seed, options.seed + 2) - 0.5) * glitchMax)
      : 0;
    const rowCells = [];
    for (let column = 0; column < columns; column += 1) {
      const x0 = clamp(Math.floor(column * cellWidth + glitchOffset), 0, options.width - 1);
      const x1 = Math.min(options.width, x0 + cellWidth);
      const raw = sampleCell(sourcePixels, options.width, options.height, x0, y0, x1, y1, chromaticShift);
      const adjusted = adjustCell(raw, options, column, row, columns, rows);
      if (options.style === "braille") {
        adjusted.dots = sampleBrailleDots(sourcePixels, options.width, options.height, x0, y0, x1, y1);
      }
      rowCells.push(adjusted);
    }
    cells.push(rowCells);
  }
  applyEdgeEmphasis(cells, options);

  const outputCanvas = createCanvas(options.width, options.height);
  const context = outputCanvas.getContext("2d");
  context.clearRect(0, 0, options.width, options.height);
  context.save();
  context.globalAlpha = options.backgroundOpacity;
  context.fillStyle = options.background;
  context.fillRect(0, 0, options.width, options.height);
  context.restore();
  for (let row = 0; row < rows; row += 1) {
    const y = row * cellHeight;
    for (let column = 0; column < columns; column += 1) {
      const x = column * cellWidth;
      const cell = cells[row][column];
      const alphaThreshold = 255 * (1 - options.coverage) * 0.15;
      if (cell.lum <= alphaThreshold) continue;
      drawShape(
        context,
        options.style,
        cell,
        x,
        y,
        cellWidth,
        cellHeight,
        options,
        column,
        row,
      );
    }
  }
  paintPostProcessing(context, options.width, options.height, options);
  return outputCanvas;
}

export async function writePng(canvas, outputPath) {
  const resolvedPath = path.resolve(outputPath);
  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir(path.dirname(resolvedPath), { recursive: true });
  const png = canvas.toBuffer("image/png", { compressionLevel: 9 });
  await writeFile(resolvedPath, png);
  return { path: resolvedPath, bytes: png.byteLength };
}
