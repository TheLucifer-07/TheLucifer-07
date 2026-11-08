#!/usr/bin/env node
import { createCanvas } from "@napi-rs/canvas";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readdir } from "node:fs/promises";
import { loadImageSource, normalizeOptions, renderImage, writePng } from "./lib/ascii-engine.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, "assets");

function randomAt(x, y, seed = 7) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function stroke(context, color = "#f2f2f2", width = 2, alpha = 1) {
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.globalAlpha = alpha;
}

function drawStars(context, width, height, count, seed) {
  context.save();
  for (let index = 0; index < count; index += 1) {
    const x = 26 + randomAt(index, seed, seed + 11) * (width - 52);
    const y = 18 + randomAt(index, seed + 3, seed + 19) * height * 0.67;
    const radius = 0.8 + randomAt(index, seed + 9, seed + 31) * 2.2;
    const alpha = 0.22 + randomAt(index, seed + 13, seed + 47) * 0.72;
    context.globalAlpha = alpha;
    context.fillStyle = "#f2f2f2";
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    if (index % 13 === 0) {
      stroke(context, "#f2f2f2", 1.4, alpha);
      context.beginPath();
      context.moveTo(x - 6, y);
      context.lineTo(x + 6, y);
      context.moveTo(x, y - 6);
      context.lineTo(x, y + 6);
      context.stroke();
    }
  }
  context.restore();
}

function drawMoon(context, cx, cy, radius) {
  context.save();
  const halo = context.createRadialGradient(cx, cy, radius * 0.48, cx, cy, radius * 1.38);
  halo.addColorStop(0, "rgba(242,242,242,0.16)");
  halo.addColorStop(0.72, "rgba(242,242,242,0.045)");
  halo.addColorStop(1, "rgba(242,242,242,0)");
  context.fillStyle = halo;
  context.beginPath();
  context.arc(cx, cy, radius * 1.4, 0, Math.PI * 2);
  context.fill();

  const moon = context.createRadialGradient(cx - radius * 0.3, cy - radius * 0.32, radius * 0.04, cx, cy, radius);
  moon.addColorStop(0, "rgba(245,245,245,0.42)");
  moon.addColorStop(0.66, "rgba(220,220,220,0.22)");
  moon.addColorStop(1, "rgba(195,195,195,0.08)");
  context.fillStyle = moon;
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fill();
  stroke(context, "#f2f2f2", 1.8, 0.56);
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.stroke();

  const craters = [
    [-0.42, -0.15, 0.08], [0.23, -0.44, 0.05], [0.43, 0.12, 0.11],
    [-0.13, 0.31, 0.07], [0.14, 0.54, 0.035], [-0.56, 0.39, 0.035],
  ];
  for (const [dx, dy, size] of craters) {
    context.globalAlpha = 0.2;
    context.fillStyle = "#050505";
    context.beginPath();
    context.arc(cx + dx * radius, cy + dy * radius, radius * size, 0, Math.PI * 2);
    context.fill();
    stroke(context, "#f2f2f2", 1, 0.28);
    context.beginPath();
    context.arc(cx + dx * radius, cy + dy * radius, radius * size, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}

function drawCity(context, width, horizon) {
  context.save();
  const buildings = [
    [430, 78, 108], [526, 52, 75], [592, 96, 146], [705, 62, 94],
    [782, 84, 160], [880, 58, 102], [950, 110, 176], [1078, 65, 116],
    [1154, 90, 146], [1250, 55, 82],
  ];
  stroke(context, "#f2f2f2", 2, 0.64);
  for (const [x, buildingWidth, buildingHeight] of buildings) {
    const top = horizon - buildingHeight;
    context.globalAlpha = 0.66;
    context.strokeRect(x, top, buildingWidth, buildingHeight);
    context.globalAlpha = 0.42;
    context.beginPath();
    context.moveTo(x + buildingWidth * 0.5, top);
    context.lineTo(x + buildingWidth * 0.5, top - 18 - (buildingWidth % 19));
    context.stroke();
    for (let windowY = top + 14; windowY < horizon - 8; windowY += 16) {
      for (let windowX = x + 11; windowX < x + buildingWidth - 8; windowX += 15) {
        const lit = randomAt(windowX, windowY, 37) > 0.35;
        if (!lit) continue;
        context.globalAlpha = 0.3 + randomAt(windowX, windowY, 43) * 0.55;
        context.fillStyle = "#f2f2f2";
        context.fillRect(windowX, windowY, 3, 5);
      }
    }
  }
  context.globalAlpha = 0.62;
  context.beginPath();
  context.moveTo(390, horizon);
  context.lineTo(width, horizon);
  context.stroke();
  context.restore();
}

function drawDeveloper(context) {
  context.save();
  // The character is a side-facing builder silhouette, drawn as line art before cell sampling.
  context.globalAlpha = 0.84;
  context.fillStyle = "#f2f2f2";
  context.beginPath();
  context.moveTo(278, 183);
  context.bezierCurveTo(266, 152, 283, 121, 313, 112);
  context.bezierCurveTo(335, 105, 354, 114, 371, 132);
  context.bezierCurveTo(382, 143, 391, 156, 398, 170);
  context.lineTo(382, 180);
  context.lineTo(372, 191);
  context.lineTo(367, 205);
  context.lineTo(358, 215);
  context.bezierCurveTo(352, 232, 341, 239, 327, 241);
  context.lineTo(316, 270);
  context.lineTo(280, 267);
  context.lineTo(290, 236);
  context.bezierCurveTo(276, 218, 273, 200, 278, 183);
  context.fill();
  context.globalAlpha = 0.98;
  context.strokeStyle = "#000000";
  context.lineWidth = 7;
  context.stroke();

  context.globalAlpha = 0.28;
  context.fillStyle = "#f2f2f2";
  context.beginPath();
  context.moveTo(108, 407);
  context.bezierCurveTo(116, 350, 155, 319, 216, 302);
  context.bezierCurveTo(266, 287, 330, 300, 376, 341);
  context.lineTo(431, 407);
  context.closePath();
  context.fill();
  context.globalAlpha = 0.95;
  context.strokeStyle = "#000000";
  context.lineWidth = 7;
  context.stroke();

  stroke(context, "#f5f5f5", 4.4, 0.98);
  context.beginPath();
  context.moveTo(108, 386);
  context.bezierCurveTo(112, 329, 145, 299, 201, 284);
  context.bezierCurveTo(231, 275, 256, 265, 275, 245);
  context.bezierCurveTo(288, 230, 291, 211, 282, 193);
  context.bezierCurveTo(276, 179, 277, 164, 289, 150);
  context.bezierCurveTo(300, 135, 320, 130, 339, 138);
  context.bezierCurveTo(350, 142, 358, 150, 366, 161);
  context.lineTo(383, 173);
  context.lineTo(367, 181);
  context.bezierCurveTo(372, 190, 369, 199, 359, 203);
  context.lineTo(357, 217);
  context.bezierCurveTo(353, 230, 341, 239, 327, 241);
  context.lineTo(321, 264);
  context.bezierCurveTo(352, 273, 383, 291, 401, 322);
  context.lineTo(436, 387);
  context.stroke();

  // Hair contour, ear, eye, and neck add enough profile detail to read at small size.
  stroke(context, "#f5f5f5", 3.2, 0.98);
  context.beginPath();
  context.moveTo(278, 183);
  context.bezierCurveTo(266, 152, 283, 121, 313, 112);
  context.bezierCurveTo(335, 105, 354, 114, 371, 132);
  context.bezierCurveTo(382, 143, 391, 156, 398, 170);
  context.bezierCurveTo(382, 160, 374, 152, 370, 142);
  context.bezierCurveTo(361, 155, 346, 160, 330, 155);
  context.bezierCurveTo(318, 171, 304, 178, 287, 177);
  context.stroke();
  context.beginPath();
  context.moveTo(329, 186);
  context.lineTo(338, 186);
  context.moveTo(286, 211);
  context.bezierCurveTo(292, 217, 300, 219, 307, 216);
  context.moveTo(319, 241);
  context.lineTo(323, 276);
  context.stroke();

  // Headset ring and ear cup nod to the reference without copying its portrait.
  context.globalAlpha = 0.76;
  context.beginPath();
  context.arc(315, 191, 56, Math.PI * 1.08, Math.PI * 1.93);
  context.stroke();
  context.beginPath();
  context.arc(277, 194, 18, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.arc(277, 194, 8, 0, Math.PI * 2);
  context.stroke();

  // Hood, shoulders, and typing arm.
  stroke(context, "#f2f2f2", 3.8, 0.92);
  context.beginPath();
  context.moveTo(117, 384);
  context.bezierCurveTo(147, 330, 198, 308, 255, 304);
  context.bezierCurveTo(295, 302, 338, 315, 376, 344);
  context.lineTo(426, 390);
  context.moveTo(106, 397);
  context.bezierCurveTo(162, 364, 207, 355, 255, 364);
  context.bezierCurveTo(291, 372, 319, 400, 348, 420);
  context.moveTo(301, 278);
  context.bezierCurveTo(310, 300, 326, 315, 346, 328);
  context.stroke();

  context.globalAlpha = 0.7;
  for (let index = 0; index < 11; index += 1) {
    const x = 138 + index * 18;
    context.beginPath();
    context.moveTo(x, 360 + (index % 3) * 5);
    context.lineTo(x - 19, 400 + (index % 4) * 5);
    context.stroke();
  }
  stroke(context, "#000000", 3.4, 0.94);
  context.beginPath();
  context.moveTo(326, 185);
  context.lineTo(338, 185);
  context.moveTo(373, 180);
  context.lineTo(384, 179);
  context.moveTo(359, 208);
  context.lineTo(369, 205);
  context.stroke();
  stroke(context, "#f5f5f5", 1.8, 0.94);
  context.beginPath();
  context.moveTo(362, 210);
  context.lineTo(371, 208);
  context.stroke();
  context.restore();
}

function drawWorkspace(context, width, horizon) {
  context.save();
  const deskY = horizon + 73;
  stroke(context, "#f4f4f4", 2.6, 0.82);
  context.beginPath();
  context.moveTo(64, deskY);
  context.lineTo(width - 60, deskY);
  context.moveTo(76, deskY + 8);
  context.lineTo(width - 71, deskY + 8);
  context.moveTo(154, deskY + 10);
  context.lineTo(143, 510);
  context.moveTo(115, 510);
  context.lineTo(169, 510);
  context.moveTo(1110, deskY + 10);
  context.lineTo(1120, 510);
  context.moveTo(1094, 510);
  context.lineTo(1145, 510);
  context.moveTo(82, 518);
  context.lineTo(1190, 518);
  context.stroke();

  // Laptop screen and keyboard base.
  context.beginPath();
  context.moveTo(616, deskY - 5);
  context.lineTo(660, deskY - 126);
  context.quadraticCurveTo(663, deskY - 133, 671, deskY - 133);
  context.lineTo(886, deskY - 133);
  context.quadraticCurveTo(894, deskY - 132, 893, deskY - 124);
  context.lineTo(866, deskY - 5);
  context.stroke();
  context.beginPath();
  context.moveTo(607, deskY - 2);
  context.lineTo(905, deskY - 2);
  context.lineTo(929, deskY + 6);
  context.lineTo(577, deskY + 6);
  context.closePath();
  context.stroke();
  context.globalAlpha = 0.82;
  context.font = "bold 34px monospace";
  context.textAlign = "center";
  context.fillStyle = "#f2f2f2";
  context.fillText("</>", 774, deskY - 68);
  context.globalAlpha = 0.55;
  for (let index = 0; index < 7; index += 1) {
    context.fillRect(680 + (index % 3) * 18, deskY - 113 + index * 13, 33 + (index % 4) * 9, 2);
  }

  // Steam and a coffee cup.
  stroke(context, "#f2f2f2", 2, 0.78);
  context.beginPath();
  context.moveTo(500, deskY - 39);
  context.quadraticCurveTo(488, deskY - 56, 500, deskY - 70);
  context.quadraticCurveTo(512, deskY - 82, 501, deskY - 95);
  context.moveTo(523, deskY - 42);
  context.quadraticCurveTo(512, deskY - 55, 524, deskY - 68);
  context.moveTo(482, deskY - 37);
  context.lineTo(482, deskY - 3);
  context.quadraticCurveTo(482, deskY + 3, 490, deskY + 3);
  context.lineTo(537, deskY + 3);
  context.lineTo(537, deskY - 38);
  context.closePath();
  context.stroke();
  context.beginPath();
  context.ellipse(540, deskY - 20, 11, 13, 0, -Math.PI / 2, Math.PI / 2);
  context.stroke();

  // A small, quiet cat silhouette keeps the scene personal rather than corporate.
  context.beginPath();
  context.moveTo(1000, deskY - 3);
  context.lineTo(1000, deskY - 55);
  context.lineTo(1016, deskY - 75);
  context.lineTo(1032, deskY - 54);
  context.lineTo(1051, deskY - 54);
  context.lineTo(1067, deskY - 76);
  context.lineTo(1082, deskY - 53);
  context.lineTo(1085, deskY - 18);
  context.quadraticCurveTo(1095, deskY - 5, 1115, deskY - 9);
  context.quadraticCurveTo(1144, deskY - 15, 1141, deskY - 48);
  context.moveTo(1000, deskY - 3);
  context.lineTo(1000, deskY - 3);
  context.stroke();
  context.beginPath();
  context.arc(1044, deskY - 38, 1.7, 0, Math.PI * 2);
  context.fillStyle = "#f2f2f2";
  context.fill();
  context.restore();
}

export function createHeroSource() {
  const width = 1280;
  const height = 560;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.fillStyle = "#000000";
  context.fillRect(0, 0, width, height);
  drawStars(context, width, height, 190, 7);
  drawMoon(context, 205, 195, 134);
  drawCity(context, width, 390);
  drawDeveloper(context);
  drawWorkspace(context, width, 390);
  return canvas;
}

export function drawHeroIdentity(canvas) {
  const context = canvas.getContext("2d");
  context.save();
  context.fillStyle = "rgba(0,0,0,0.88)";
  context.beginPath();
  context.moveTo(545, 38);
  context.lineTo(1208, 38);
  context.lineTo(1225, 55);
  context.lineTo(1225, 185);
  context.lineTo(1208, 202);
  context.lineTo(528, 202);
  context.lineTo(528, 55);
  context.lineTo(545, 38);
  context.closePath();
  context.fill();
  stroke(context, "#f2f2f2", 2.1, 0.9);
  context.beginPath();
  context.moveTo(545, 38);
  context.lineTo(1208, 38);
  context.lineTo(1225, 55);
  context.lineTo(1225, 185);
  context.lineTo(1208, 202);
  context.lineTo(528, 202);
  context.lineTo(528, 55);
  context.lineTo(545, 38);
  context.stroke();
  context.globalAlpha = 0.9;
  context.fillStyle = "#f5f5f5";
  context.font = "bold 47px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("THE LUCIFER 07", 876, 98);
  context.font = "bold 21px monospace";
  context.fillText("Hemachandu Animireddy", 876, 150);
  context.font = "16px monospace";
  context.fillText("Developer  /  Problem Solver  /  Builder", 876, 180);
  context.globalAlpha = 0.78;
  context.fillRect(554, 49, 9, 3);
  context.fillRect(570, 49, 9, 3);
  context.fillRect(586, 49, 9, 3);
  context.fillRect(602, 49, 9, 3);
  context.restore();
}

function drawMountainRange(context, points, alpha, width) {
  context.save();
  stroke(context, "#f2f2f2", width, alpha);
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index][0], points[index][1]);
  }
  context.stroke();
  context.restore();
}

export function createLandscapeSource() {
  const width = 1280;
  const height = 245;
  const horizon = 126;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.fillStyle = "#000000";
  context.fillRect(0, 0, width, height);
  drawStars(context, width, 95, 58, 113);

  context.save();
  context.globalAlpha = 0.42;
  context.fillStyle = "#f2f2f2";
  context.beginPath();
  context.arc(640, 107, 73, Math.PI, Math.PI * 2);
  context.fill();
  context.restore();
  stroke(context, "#f2f2f2", 1.5, 0.66);
  context.beginPath();
  context.arc(640, 107, 73, Math.PI, Math.PI * 2);
  context.stroke();
  for (let y = 55; y < 108; y += 12) {
    const inset = Math.sqrt(Math.max(0, 73 * 73 - Math.pow(107 - y, 2)));
    context.save();
    stroke(context, "#000000", 3, 0.9);
    context.beginPath();
    context.moveTo(640 - inset, y);
    context.lineTo(640 + inset, y);
    context.stroke();
    context.restore();
  }

  drawMountainRange(context, [
    [-18, 160], [95, 83], [157, 118], [222, 46], [298, 107], [365, 91], [433, 143], [512, 131],
  ], 0.78, 2.4);
  drawMountainRange(context, [
    [753, 147], [834, 115], [911, 129], [1016, 51], [1084, 100], [1148, 87], [1235, 137], [1300, 121],
  ], 0.76, 2.4);
  drawMountainRange(context, [[147, 119], [222, 46], [204, 112], [269, 96]], 0.32, 1.3);
  drawMountainRange(context, [[912, 129], [1016, 51], [1001, 117], [1076, 97]], 0.32, 1.3);
  stroke(context, "#f2f2f2", 1.8, 0.74);
  context.beginPath();
  context.moveTo(0, horizon);
  context.lineTo(width, horizon);
  context.stroke();

  // Broken horizontal strokes make the reflected light feel like water and keep the scene static.
  for (let row = 0; row < 20; row += 1) {
    const y = horizon + 7 + row * 5;
    const centerSpan = Math.max(22, 115 - row * 4.7);
    const segmentCount = 12 + row % 7;
    for (let index = 0; index < segmentCount; index += 1) {
      const x = randomAt(index, row, 67) * width;
      const distance = Math.abs(x - 640);
      const inReflection = distance < centerSpan;
      if (!inReflection && randomAt(row, index, 89) < 0.45) continue;
      const segmentWidth = inReflection
        ? 7 + randomAt(row, index, 101) * Math.max(4, centerSpan - distance)
        : 8 + randomAt(index, row, 107) * 46;
      context.globalAlpha = (inReflection ? 0.22 : 0.12) + randomAt(index, row, 127) * 0.35;
      context.fillStyle = "#f2f2f2";
      context.fillRect(x, y, segmentWidth, 1.4);
    }
  }
  context.globalAlpha = 1;
  for (let index = 0; index < 70; index += 1) {
    const x = randomAt(index, 219, 149) * width;
    const y = horizon + 3 + randomAt(index, 223, 157) * 103;
    const size = randomAt(index, 227, 163) > 0.88 ? 2.2 : 1.1;
    context.fillStyle = "#f2f2f2";
    context.globalAlpha = 0.18 + randomAt(index, 229, 167) * 0.34;
    context.fillRect(x, y, size, size);
  }
  context.globalAlpha = 1;
  return canvas;
}

function printHelp() {
  console.log([
    "Generate the profile's static PNG artwork, or convert an image to a cell-based render.",
    "",
    "Default: npm run art",
    "Convert: npm run art -- --input photo.png --output assets/custom.png --style braille",
    "",
    "Options: --input, --output, --style, --width, --height, --cell-size, --density,",
    "--coverage, --brightness, --contrast, --saturation, --grayscale, --invert,",
    "--edge-emphasis, --background, --background-opacity, --blur, --tint, --bloom,",
    "--vignette, --chromatic-aberration, --film-grain, --scanlines, --glitch,",
    "--lighting, --fit, --ramp, --seed",
    "",
    "Styles: characters, dots, braille, mosaic, pixel, cross, diamond, mixed, lines,",
    "diagonal, rings, stars, hexagons, triangles, halfblocks",
  ].join("\n"));
}

function parseArguments(argv) {
  const values = {};
  const booleans = new Set(["grayscale", "invert"]);
  const supported = new Set([
    "input", "output", "style", "width", "height", "cell-size", "density", "coverage",
    "brightness", "contrast", "saturation", "grayscale", "invert", "no-grayscale", "no-invert",
    "edge-emphasis", "background", "background-opacity", "blur", "tint", "bloom", "vignette",
    "chromatic-aberration", "film-grain", "scanlines", "glitch", "lighting", "fit", "ramp", "seed",
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      return { help: true, values };
    }
    if (!token.startsWith("--")) {
      throw new Error("Unexpected argument: " + token);
    }
    const key = token.slice(2);
    if (!supported.has(key)) {
      throw new Error("Unknown option: " + token);
    }
    if (key.startsWith("no-") && booleans.has(key.slice(3))) {
      values[toCamel(key.slice(3))] = false;
      continue;
    }
    const camelKey = toCamel(key);
    if (booleans.has(key)) {
      values[camelKey] = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error("Missing value for " + token);
    }
    values[camelKey] = value;
    index += 1;
  }
  for (const key of [
    "width", "height", "cellSize", "seed", "density", "coverage", "brightness", "contrast",
    "saturation", "edgeEmphasis", "backgroundOpacity", "blur", "bloom", "vignette",
    "chromaticAberration", "filmGrain", "scanlines", "glitch", "lighting",
  ]) {
    if (values[key] !== undefined) values[key] = Number(values[key]);
  }
  return { help: false, values };
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

async function generateProfileAssets() {
  const hero = await renderImage(createHeroSource(), normalizeOptions({
    width: 1280,
    height: 470,
    cellSize: 8,
    density: 1.18,
    coverage: 0.88,
    brightness: 0.48,
    contrast: 0.9,
    edgeEmphasis: 0.22,
    style: "characters",
    tint: "#f2f2f2",
    bloom: 0.08,
    vignette: 0.24,
    filmGrain: 0.035,
    seed: 7,
  }));
  drawHeroIdentity(hero);
  const footer = await renderImage(createLandscapeSource(), normalizeOptions({
    width: 1280,
    height: 245,
    cellSize: 8,
    density: 1.18,
    coverage: 0.9,
    brightness: 0.48,
    contrast: 0.9,
    edgeEmphasis: 0.18,
    style: "dots",
    tint: "#f2f2f2",
    vignette: 0.2,
    seed: 19,
  }));
  const heroFile = await writePng(hero, path.join(OUTPUT, "hero-ascii.png"));
  const footerFile = await writePng(footer, path.join(OUTPUT, "footer-landscape.png"));
  console.log("Wrote " + heroFile.path + " (" + heroFile.bytes + " bytes)");
  console.log("Wrote " + footerFile.path + " (" + footerFile.bytes + " bytes)");
  await generateTechIcons();
}

async function generateTechIcons() {
  const iconDirectory = path.join(OUTPUT, "icons");
  const sourceFiles = (await readdir(iconDirectory)).filter((file) => file.endsWith(".svg")).sort();
  for (const sourceFile of sourceFiles) {
    const image = await loadImageSource(path.join(iconDirectory, sourceFile));
    const canvas = createCanvas(24, 24);
    canvas.getContext("2d").drawImage(image, 0, 0, 24, 24);
    const outputFile = sourceFile.replace(/\.svg$/i, ".png");
    const result = await writePng(canvas, path.join(iconDirectory, outputFile));
    console.log("Wrote " + result.path + " (" + result.bytes + " bytes)");
  }
}

async function convertImage(values) {
  if (!values.input) throw new Error("--input is required for image conversion.");
  const image = await loadImageSource(values.input);
  const options = normalizeOptions({
    ...values,
    input: undefined,
    output: undefined,
    width: values.width || 1280,
    height: values.height || 720,
    style: values.style || "characters",
  });
  const canvas = await renderImage(image, options);
  const defaultOutput = path.join(OUTPUT, "converted-ascii.png");
  const result = await writePng(canvas, values.output || defaultOutput);
  console.log("Wrote " + result.path + " (" + result.bytes + " bytes)");
}

async function main() {
  const parsed = parseArguments(process.argv.slice(2));
  if (parsed.help) {
    printHelp();
    return;
  }
  if (parsed.values.input) {
    await convertImage(parsed.values);
  } else {
    await generateProfileAssets();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("Artwork generation failed: " + error.message);
    process.exitCode = 1;
  });
}
