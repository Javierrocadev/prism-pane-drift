/**
 * Prism Pane Drift - 2D Canvas Multi-Pass Visual Renderer
 * Executes high-performance rendering with Retina DPI support, aurora blending,
 * frosted glass refraction simulation, and photorealistic neon specular edge bloom.
 */

import type { EvaluatedScene, PrismConfig } from "./prism-pane-drift-model";

let noisePatternCache: CanvasPattern | null = null;
let lastNoiseIntensity = -1;

function getNoisePattern(ctx: CanvasRenderingContext2D, intensity: number): CanvasPattern | null {
  if (intensity <= 0) return null;
  if (noisePatternCache && lastNoiseIntensity === intensity) {
    return noisePatternCache;
  }

  const size = 128;
  const offscreen = document.createElement("canvas");
  offscreen.width = size;
  offscreen.height = size;
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) return null;

  const imgData = offCtx.createImageData(size, size);
  const data = imgData.data;
  const alpha = Math.min(255, Math.round((intensity / 100) * 45));

  for (let i = 0; i < data.length; i += 4) {
    const val = (Math.random() * 255) | 0;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = alpha;
  }

  offCtx.putImageData(imgData, 0, 0);
  noisePatternCache = ctx.createPattern(offscreen, "repeat");
  lastNoiseIntensity = intensity;
  return noisePatternCache;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawIlluminatedLeadingEdge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
}

export function parseHexToRgb(hexStr?: string): { r: number; g: number; b: number } {
  if (!hexStr) return { r: 120, g: 40, b: 180 };
  let hex = hexStr.replace(/^#/, "").trim();
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  if (hex.length >= 6) {
    const num = parseInt(hex.slice(0, 6), 16);
    if (!Number.isNaN(num)) {
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
      };
    }
  }
  return { r: 120, g: 40, b: 180 };
}

export function renderPrismScene(
  ctx: CanvasRenderingContext2D,
  scene: EvaluatedScene,
  config: PrismConfig,
  width: number,
  height: number,
): void {
  ctx.save();

  // 1. Base dark background
  ctx.fillStyle = scene.palette.bgDark;
  ctx.fillRect(0, 0, width, height);

  // 2. Vibrant Aurora Orbs (Mesh Gradient via Additive Blend)
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  for (const orb of scene.orbs) {
    const cx = orb.xNorm * width;
    const cy = orb.yNorm * height;
    const r = orb.radiusNorm * Math.max(width, height);

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, orb.color);
    grad.addColorStop(0.35, orb.color + "99");
    grad.addColorStop(0.7, orb.color + "33");
    grad.addColorStop(1, "transparent");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();

  // 3. Diagonal Light Streaks (subtle, soft parallel laser beams across the composition)
  if (scene.streaks.length > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const diagAngle = (config.angleDeg * Math.PI) / 180;
    const perpAngle = diagAngle + Math.PI / 2;
    const cosDiag = Math.cos(diagAngle);
    const sinDiag = Math.sin(diagAngle);
    const cosPerp = Math.cos(perpAngle);
    const sinPerp = Math.sin(perpAngle);
    const maxDim = Math.hypot(width, height) * 1.5;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    for (const streak of scene.streaks) {
      const offsetDist = (streak.offsetNorm - 0.5) * maxDim;
      const originX = halfWidth + cosPerp * offsetDist;
      const originY = halfHeight + sinPerp * offsetDist;

      const p1x = originX - cosDiag * maxDim;
      const p1y = originY - sinDiag * maxDim;
      const p2x = originX + cosDiag * maxDim;
      const p2y = originY + sinDiag * maxDim;

      const lineGrad = ctx.createLinearGradient(p1x, p1y, p2x, p2y);
      lineGrad.addColorStop(0, "transparent");
      lineGrad.addColorStop(0.25, "transparent");
      lineGrad.addColorStop(0.42, scene.palette.streakColor);
      lineGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.45)");
      lineGrad.addColorStop(0.58, scene.palette.streakColor);
      lineGrad.addColorStop(0.75, "transparent");
      lineGrad.addColorStop(1, "transparent");

      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = streak.thickness;
      ctx.lineCap = "round";
      ctx.globalAlpha = Math.min(0.55, Math.max(0, streak.intensity * 0.6));

      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 4. Glass Panes Layer with Multi-Pass Photorealistic Glowing Edges & Refraction
  const glowFactor = config.edgeGlow / 100;
  const glassRgb = parseHexToRgb(config.glassColor ?? "#7828b4");

  for (const pane of scene.panes) {
    ctx.save();
    ctx.translate(pane.centerX, pane.centerY);
    ctx.rotate(pane.angle);

    const halfW = pane.width / 2;
    const halfH = pane.height / 2;
    const cornerR = Math.min(config.cornerRadius, halfW * 0.4, halfH * 0.4);

    // 4A. Drop Shadow / Ambient Occlusion behind glass with soft chromatic bleed
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = 28 * pane.depth;
    ctx.shadowOffsetX = 10 * pane.depth;
    ctx.shadowOffsetY = 16 * pane.depth;
    ctx.fillStyle = `rgba(${Math.round(glassRgb.r * 0.08)}, ${Math.round(glassRgb.g * 0.08)}, ${Math.round(glassRgb.b * 0.08)}, 0.18)`;
    drawRoundedRect(ctx, -halfW, -halfH, pane.width, pane.height, cornerR);
    ctx.fill();
    ctx.restore();

    // 4B. Glass Pane Body (Frosted Translucency, Caustic Sheen & Internal Depth)
    ctx.save();
    drawRoundedRect(ctx, -halfW, -halfH, pane.width, pane.height, cornerR);
    ctx.clip();

    // Internal refraction gradient simulating ambient background pickup and light bend
    const glassGrad = ctx.createLinearGradient(
      -halfW + pane.refractionOffsetX,
      -halfH + pane.refractionOffsetY,
      halfW,
      halfH,
    );
    const r15 = Math.round(255 * 0.85 + glassRgb.r * 0.15);
    const g15 = Math.round(255 * 0.85 + glassRgb.g * 0.15);
    const b15 = Math.round(255 * 0.85 + glassRgb.b * 0.15);

    const r55 = Math.round(255 * 0.45 + glassRgb.r * 0.55);
    const g55 = Math.round(255 * 0.45 + glassRgb.g * 0.55);
    const b55 = Math.round(255 * 0.45 + glassRgb.b * 0.55);

    const rShadow = Math.round(glassRgb.r * 0.25);
    const gShadow = Math.round(glassRgb.g * 0.25);
    const bShadow = Math.round(glassRgb.b * 0.25);

    glassGrad.addColorStop(0, `rgba(255, 255, 255, ${pane.opacity * 0.9})`);
    glassGrad.addColorStop(0.2, `rgba(${r15}, ${g15}, ${b15}, ${pane.opacity * 0.45})`);
    glassGrad.addColorStop(0.5, `rgba(${r55}, ${g55}, ${b55}, ${pane.opacity * 0.22})`);
    glassGrad.addColorStop(0.85, `rgba(${glassRgb.r}, ${glassRgb.g}, ${glassRgb.b}, ${pane.opacity * 0.55})`);
    glassGrad.addColorStop(1, `rgba(${rShadow}, ${gShadow}, ${bShadow}, ${pane.opacity * 0.8})`);

    ctx.fillStyle = glassGrad;
    ctx.fillRect(-halfW, -halfH, pane.width, pane.height);

    // Diagonal specular wash across the surface
    const sheenGrad = ctx.createLinearGradient(-halfW, -halfH, halfW * 0.5, halfH * 0.5);
    sheenGrad.addColorStop(0, "rgba(255, 255, 255, 0.4)");
    sheenGrad.addColorStop(0.25, "rgba(255, 255, 255, 0.1)");
    sheenGrad.addColorStop(0.55, "transparent");
    sheenGrad.addColorStop(1, "rgba(255, 255, 255, 0.05)");

    ctx.fillStyle = sheenGrad;
    ctx.fillRect(-halfW, -halfH, pane.width, pane.height);

    // 4B. Inside pane: Internal Edge Refraction Bleed (Light diffusing through glass medium)
    const innerLightBleed = ctx.createLinearGradient(
      -halfW,
      -halfH,
      -halfW + 45 * pane.depth,
      -halfH + 45 * pane.depth,
    );
    innerLightBleed.addColorStop(0, `rgba(255, 255, 255, ${0.4 * glowFactor})`);
    innerLightBleed.addColorStop(0.35, scene.palette.orb2 + "28");
    innerLightBleed.addColorStop(0.7, scene.palette.orb3 + "14");
    innerLightBleed.addColorStop(1, "transparent");
    ctx.fillStyle = innerLightBleed;
    ctx.fillRect(-halfW, -halfH, pane.width, pane.height);

    ctx.restore(); // Exit clip

    // 4C. Grounded Subtle Glass Perimeter Rim (Directional bevel line)
    // Avoids artificial wireframe boxes: illuminated at top-left, fades away on bottom-right
    const rimGrad = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
    rimGrad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(0.75, 0.35 + 0.35 * glowFactor)})`);
    rimGrad.addColorStop(0.3, scene.palette.streakColor || "rgba(255, 180, 240, 0.4)");
    rimGrad.addColorStop(0.7, "rgba(255, 255, 255, 0.12)");
    rimGrad.addColorStop(1, "rgba(255, 255, 255, 0.04)");

    ctx.strokeStyle = rimGrad;
    ctx.lineWidth = 1.0;
    drawRoundedRect(ctx, -halfW, -halfH, pane.width, pane.height, cornerR);
    ctx.stroke();

    // 4D. Tapered reflected light, continuous through the top-right corner.
    if (glowFactor > 0.05) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";

      const edgeLight = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
      const cornerStop = pane.width ** 2 / (pane.width ** 2 + pane.height ** 2);
      edgeLight.addColorStop(0, "transparent");
      edgeLight.addColorStop(cornerStop * 0.4, scene.palette.orb2 + "18");
      edgeLight.addColorStop(cornerStop, scene.palette.glintColor + "88");
      edgeLight.addColorStop(cornerStop + (1 - cornerStop) * 0.55, scene.palette.orb2 + "18");
      edgeLight.addColorStop(1, "transparent");

      // Pass 1: Soft Atmospheric Bloom along the illuminated leading edge
      ctx.save();
      ctx.shadowColor = scene.palette.orb2;
      ctx.shadowBlur = Math.round(20 * glowFactor * pane.depth);
      ctx.strokeStyle = edgeLight;
      ctx.globalAlpha = 0.24 * glowFactor;
      ctx.lineWidth = Math.max(2, pane.bevelWidth * 1.25);
      ctx.lineCap = "round";
      drawIlluminatedLeadingEdge(ctx, -halfW, -halfH, pane.width, pane.height, cornerR);
      ctx.stroke();
      ctx.restore();

      // Pass 2: A thin translucent reflection rather than an opaque white outline.
      ctx.save();
      ctx.shadowColor = scene.palette.glintColor;
      ctx.shadowBlur = Math.round(10 * glowFactor * pane.depth);
      ctx.strokeStyle = edgeLight;
      ctx.globalAlpha = 0.28 * glowFactor;
      ctx.lineWidth = 0.65;
      ctx.lineCap = "round";
      drawIlluminatedLeadingEdge(ctx, -halfW, -halfH, pane.width, pane.height, cornerR);
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    }

    // 4E. Directional Specular Glint & Smooth Lens Flare along Illuminated Edge
    if (pane.glintIntensity > 0.05) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = pane.glintIntensity * 0.4;

      // Travel naturally along the illuminated top edge and corner
      const pT = pane.glintProgress;
      let gx = -halfW + cornerR;
      let gy = -halfH;
      let isHorizontal = true;

      if (pT < 0.7) {
        // Glint sliding across top illuminated edge
        gx = -halfW + cornerR + (pT / 0.7) * (pane.width - 2 * cornerR);
        gy = -halfH;
        isHorizontal = true;
      } else {
        // Glint rounding the top-right corner and sliding down right facet
        const normCorner = (pT - 0.7) / 0.3;
        gx = halfW;
        gy = -halfH + cornerR + normCorner * (pane.height * 0.4);
        isHorizontal = false;
      }

      // Soft circular specular burst
      const flareRadius = 28 * pane.depth * glowFactor;
      const flareGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, flareRadius);
      flareGrad.addColorStop(0, "rgba(255, 250, 255, 0.55)");
      flareGrad.addColorStop(0.15, "rgba(255, 250, 255, 0.35)");
      flareGrad.addColorStop(0.4, scene.palette.glintColor + "88");
      flareGrad.addColorStop(0.75, scene.palette.orb2 + "33");
      flareGrad.addColorStop(1, "transparent");

      ctx.fillStyle = flareGrad;
      ctx.beginPath();
      ctx.arc(gx, gy, flareRadius, 0, Math.PI * 2);
      ctx.fill();

      // Anamorphic specular highlight streak along the glass edge
      const streakLen = 40 * pane.depth * glowFactor;
      const streakGrad = isHorizontal
        ? ctx.createLinearGradient(gx - streakLen, gy, gx + streakLen, gy)
        : ctx.createLinearGradient(gx, gy - streakLen, gx, gy + streakLen);

      streakGrad.addColorStop(0, "transparent");
      streakGrad.addColorStop(0.35, scene.palette.glintColor + "66");
      streakGrad.addColorStop(0.5, "#ffffff");
      streakGrad.addColorStop(0.65, scene.palette.glintColor + "66");
      streakGrad.addColorStop(1, "transparent");

      ctx.strokeStyle = streakGrad;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      if (isHorizontal) {
        ctx.moveTo(gx - streakLen, gy);
        ctx.lineTo(gx + streakLen, gy);
      } else {
        ctx.moveTo(gx, gy - streakLen);
        ctx.lineTo(gx, gy + streakLen);
      }
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore(); // Exit pane transform
  }

  // 5. Film Grain Overlay (Analogue Studio Texture)
  if (config.grainIntensity > 0 && typeof document !== "undefined") {
    const pattern = getNoisePattern(ctx, config.grainIntensity);
    if (pattern) {
      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  ctx.restore();
}
