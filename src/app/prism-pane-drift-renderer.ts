/**
 * Prism Pane Drift - 2D Canvas Multi-Pass Visual Renderer
 * Executes high-performance rendering with Retina DPI support, aurora blending,
 * frosted glass refraction simulation, and specular edge glints.
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

  // 3. Diagonal Light Streaks (fine parallel laser beams across the composition)
  if (scene.streaks.length > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const diagAngle = (config.angleDeg * Math.PI) / 180;
    const perpAngle = diagAngle + Math.PI / 2;
    const maxDim = Math.hypot(width, height) * 1.5;

    for (const streak of scene.streaks) {
      const offsetDist = (streak.offsetNorm - 0.5) * maxDim;
      const originX = width / 2 + Math.cos(perpAngle) * offsetDist;
      const originY = height / 2 + Math.sin(perpAngle) * offsetDist;

      const p1x = originX - Math.cos(diagAngle) * maxDim;
      const p1y = originY - Math.sin(diagAngle) * maxDim;
      const p2x = originX + Math.cos(diagAngle) * maxDim;
      const p2y = originY + Math.sin(diagAngle) * maxDim;

      const lineGrad = ctx.createLinearGradient(p1x, p1y, p2x, p2y);
      lineGrad.addColorStop(0, "transparent");
      lineGrad.addColorStop(0.3, scene.palette.streakColor);
      lineGrad.addColorStop(0.5, "#ffffff");
      lineGrad.addColorStop(0.7, scene.palette.streakColor);
      lineGrad.addColorStop(1, "transparent");

      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = streak.thickness;
      ctx.globalAlpha = Math.min(1, Math.max(0, streak.intensity));

      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 4. Glass Panes Layer
  for (const pane of scene.panes) {
    ctx.save();
    ctx.translate(pane.centerX, pane.centerY);
    ctx.rotate(pane.angle);

    const halfW = pane.width / 2;
    const halfH = pane.height / 2;
    const cornerR = Math.min(config.cornerRadius, halfW * 0.4, halfH * 0.4);

    // 4A. Drop Shadow / Ambient Occlusion behind glass
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 24 * pane.depth;
    ctx.shadowOffsetX = 8 * pane.depth;
    ctx.shadowOffsetY = 14 * pane.depth;
    ctx.fillStyle = "rgba(10, 5, 20, 0.15)";
    drawRoundedRect(ctx, -halfW, -halfH, pane.width, pane.height, cornerR);
    ctx.fill();
    ctx.restore();

    // 4B. Glass Pane Body (Frosted Translucency & Specular Sheen)
    ctx.save();
    drawRoundedRect(ctx, -halfW, -halfH, pane.width, pane.height, cornerR);
    ctx.clip();

    // Internal refraction gradient simulating ambient background pickup
    const glassGrad = ctx.createLinearGradient(
      -halfW + pane.refractionOffsetX,
      -halfH + pane.refractionOffsetY,
      halfW,
      halfH,
    );
    glassGrad.addColorStop(0, `rgba(255, 255, 255, ${pane.opacity * 0.85})`);
    glassGrad.addColorStop(0.2, `rgba(240, 210, 255, ${pane.opacity * 0.4})`);
    glassGrad.addColorStop(0.5, `rgba(180, 140, 230, ${pane.opacity * 0.18})`);
    glassGrad.addColorStop(0.85, `rgba(120, 40, 180, ${pane.opacity * 0.5})`);
    glassGrad.addColorStop(1, `rgba(40, 10, 80, ${pane.opacity * 0.75})`);

    ctx.fillStyle = glassGrad;
    ctx.fillRect(-halfW, -halfH, pane.width, pane.height);

    // Diagonal specular wash across the surface
    const sheenGrad = ctx.createLinearGradient(-halfW, -halfH, halfW * 0.4, halfH * 0.4);
    sheenGrad.addColorStop(0, "rgba(255, 255, 255, 0.35)");
    sheenGrad.addColorStop(0.3, "rgba(255, 255, 255, 0.08)");
    sheenGrad.addColorStop(0.5, "transparent");
    sheenGrad.addColorStop(1, "rgba(255, 255, 255, 0.04)");

    ctx.fillStyle = sheenGrad;
    ctx.fillRect(-halfW, -halfH, pane.width, pane.height);
    ctx.restore(); // Exit clip

    // 4C. Chromatic Aberration Rim (Faint RGB split around borders)
    if (config.chromaticAberration > 1) {
      const ca = (config.chromaticAberration / 20) * 2;
      ctx.save();
      ctx.lineWidth = 1;
      ctx.globalCompositeOperation = "screen";

      // Cyan fringe shifted
      ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
      drawRoundedRect(ctx, -halfW - ca, -halfH - ca, pane.width, pane.height, cornerR);
      ctx.stroke();

      // Magenta fringe shifted
      ctx.strokeStyle = "rgba(255, 0, 128, 0.4)";
      drawRoundedRect(ctx, -halfW + ca, -halfH + ca, pane.width, pane.height, cornerR);
      ctx.stroke();
      ctx.restore();
    }

    // 4D. Precision Beveled Edge Stroke
    ctx.save();
    const bevelGrad = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
    bevelGrad.addColorStop(0, `rgba(255, 255, 255, ${0.7 + (config.edgeGlow / 100) * 0.3})`);
    bevelGrad.addColorStop(0.4, "rgba(255, 200, 240, 0.4)");
    bevelGrad.addColorStop(0.7, "rgba(100, 30, 160, 0.2)");
    bevelGrad.addColorStop(1, "rgba(255, 255, 255, 0.5)");

    ctx.strokeStyle = bevelGrad;
    ctx.lineWidth = pane.bevelWidth;
    drawRoundedRect(ctx, -halfW, -halfH, pane.width, pane.height, cornerR);
    ctx.stroke();
    ctx.restore();

    // 4E. Intense Specular Edge Glint (Blinding light flare traveling on perimeter)
    if (pane.glintIntensity > 0.05) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";

      // Position on top or right edge
      const perimeterT = pane.glintProgress;
      let gx = -halfW;
      let gy = -halfH;

      if (perimeterT < 0.5) {
        // Traveling across top edge
        gx = -halfW + perimeterT * 2 * pane.width;
        gy = -halfH;
      } else {
        // Traveling down right edge
        gx = halfW;
        gy = -halfH + (perimeterT - 0.5) * 2 * pane.height;
      }

      const flareRadius = 40 * pane.depth * (config.edgeGlow / 100);
      const flareGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, flareRadius);
      flareGrad.addColorStop(0, "#ffffff");
      flareGrad.addColorStop(0.15, "rgba(255, 240, 250, 0.95)");
      flareGrad.addColorStop(0.4, scene.palette.glintColor + "88");
      flareGrad.addColorStop(1, "transparent");

      ctx.fillStyle = flareGrad;
      ctx.beginPath();
      ctx.arc(gx, gy, flareRadius, 0, Math.PI * 2);
      ctx.fill();

      // Sharp cross flare
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 1.5;
      const rayLen = flareRadius * 1.6;

      ctx.beginPath();
      ctx.moveTo(gx - rayLen, gy);
      ctx.lineTo(gx + rayLen, gy);
      ctx.moveTo(gx, gy - rayLen);
      ctx.lineTo(gx, gy + rayLen);
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
