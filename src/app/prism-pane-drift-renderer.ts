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

  // 4. Glass Panes Layer with Multi-Pass Photorealistic Glowing Edges & Refraction
  const glowFactor = config.edgeGlow / 100;

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
    ctx.fillStyle = "rgba(10, 5, 20, 0.18)";
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
    glassGrad.addColorStop(0, `rgba(255, 255, 255, ${pane.opacity * 0.9})`);
    glassGrad.addColorStop(0.2, `rgba(245, 220, 255, ${pane.opacity * 0.45})`);
    glassGrad.addColorStop(0.5, `rgba(180, 140, 230, ${pane.opacity * 0.22})`);
    glassGrad.addColorStop(0.85, `rgba(120, 40, 180, ${pane.opacity * 0.55})`);
    glassGrad.addColorStop(1, `rgba(30, 10, 60, ${pane.opacity * 0.8})`);

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

    // Inner rim Fresnel reflection (mimics light trapped inside polished glass edge)
    const innerRimGrad = ctx.createLinearGradient(-halfW, -halfH, -halfW + 30, -halfH + 30);
    innerRimGrad.addColorStop(0, "rgba(255, 255, 255, 0.5)");
    innerRimGrad.addColorStop(0.5, "rgba(255, 200, 250, 0.15)");
    innerRimGrad.addColorStop(1, "transparent");
    ctx.strokeStyle = innerRimGrad;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, -halfW + 1.5, -halfH + 1.5, pane.width - 3, pane.height - 3, Math.max(0, cornerR - 1.5));
    ctx.stroke();

    ctx.restore(); // Exit clip

    // 4C. Chromatic Aberration Rim (Faint RGB spectral split around borders)
    if (config.chromaticAberration > 1) {
      const ca = (config.chromaticAberration / 20) * 2.5;
      ctx.save();
      ctx.lineWidth = 1.2;
      ctx.globalCompositeOperation = "screen";

      // Cyan fringe shifted
      ctx.strokeStyle = "rgba(0, 240, 255, 0.45)";
      drawRoundedRect(ctx, -halfW - ca, -halfH - ca, pane.width, pane.height, cornerR);
      ctx.stroke();

      // Magenta fringe shifted
      ctx.strokeStyle = "rgba(255, 0, 150, 0.45)";
      drawRoundedRect(ctx, -halfW + ca, -halfH + ca, pane.width, pane.height, cornerR);
      ctx.stroke();
      ctx.restore();
    }

    // 4D. MULTI-PASS PHOTOREALISTIC NEON EDGE GLOW (Additive Screen Bloom)
    // Eliminates the flat vector "drawing" stroke with real laser/specular light dispersion
    if (glowFactor > 0.05) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";

      // Layer 1: Wide Atmospheric Bloom (soft diffuse neon halo in surrounding air)
      ctx.save();
      ctx.shadowColor = scene.palette.orb2;
      ctx.shadowBlur = Math.round(28 * glowFactor * pane.depth);
      ctx.strokeStyle = scene.palette.orb2;
      ctx.globalAlpha = 0.5 * glowFactor;
      ctx.lineWidth = Math.max(2, pane.bevelWidth * 1.8);
      drawRoundedRect(ctx, -halfW, -halfH, pane.width, pane.height, cornerR);
      ctx.stroke();
      ctx.restore();

      // Layer 2: Focused Saturated Core Glow
      ctx.save();
      ctx.shadowColor = scene.palette.orb3 || scene.palette.glintColor;
      ctx.shadowBlur = Math.round(12 * glowFactor * pane.depth);
      ctx.strokeStyle = scene.palette.streakColor || "rgba(255, 180, 240, 0.9)";
      ctx.globalAlpha = 0.75 * glowFactor;
      ctx.lineWidth = Math.max(1.5, pane.bevelWidth * 1.2);
      drawRoundedRect(ctx, -halfW, -halfH, pane.width, pane.height, cornerR);
      ctx.stroke();
      ctx.restore();

      // Layer 3: Incandescent Razor-Sharp White Hot Core
      // The hallmark of real backlit neon glass: pure white center that cuts through the bloom
      ctx.save();
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = Math.round(4 * glowFactor);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.globalAlpha = Math.min(1, 0.6 + glowFactor * 0.4);
      ctx.lineWidth = 1.0;
      drawRoundedRect(ctx, -halfW, -halfH, pane.width, pane.height, cornerR);
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    }

    // 4E. Intense Specular Glints & Anamorphic Optical Flares
    if (pane.glintIntensity > 0.05) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";

      const perimeterT = pane.glintProgress;
      let gx = -halfW;
      let gy = -halfH;
      let isHorizontal = true;

      if (perimeterT < 0.5) {
        // Traveling across top edge
        gx = -halfW + perimeterT * 2 * pane.width;
        gy = -halfH;
        isHorizontal = true;
      } else {
        // Traveling down right edge
        gx = halfW;
        gy = -halfH + (perimeterT - 0.5) * 2 * pane.height;
        isHorizontal = false;
      }

      const flareRadius = 45 * pane.depth * glowFactor;
      const flareGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, flareRadius);
      flareGrad.addColorStop(0, "#ffffff");
      flareGrad.addColorStop(0.12, "rgba(255, 250, 255, 0.98)");
      flareGrad.addColorStop(0.35, scene.palette.glintColor + "99");
      flareGrad.addColorStop(0.7, scene.palette.orb2 + "44");
      flareGrad.addColorStop(1, "transparent");

      ctx.fillStyle = flareGrad;
      ctx.beginPath();
      ctx.arc(gx, gy, flareRadius, 0, Math.PI * 2);
      ctx.fill();

      // Anamorphic horizontal optical beam along the glass edge
      const streakLen = 70 * pane.depth * glowFactor;
      const streakGrad = isHorizontal
        ? ctx.createLinearGradient(gx - streakLen, gy, gx + streakLen, gy)
        : ctx.createLinearGradient(gx, gy - streakLen, gx, gy + streakLen);

      streakGrad.addColorStop(0, "transparent");
      streakGrad.addColorStop(0.3, scene.palette.glintColor + "66");
      streakGrad.addColorStop(0.5, "#ffffff");
      streakGrad.addColorStop(0.7, scene.palette.glintColor + "66");
      streakGrad.addColorStop(1, "transparent");

      ctx.strokeStyle = streakGrad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (isHorizontal) {
        ctx.moveTo(gx - streakLen, gy);
        ctx.lineTo(gx + streakLen, gy);
      } else {
        ctx.moveTo(gx, gy - streakLen);
        ctx.lineTo(gx, gy + streakLen);
      }
      ctx.stroke();

      // Sharp diagonal diamond spike
      const diagLen = flareRadius * 0.9;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(gx - diagLen * 0.7, gy - diagLen * 0.7);
      ctx.lineTo(gx + diagLen * 0.7, gy + diagLen * 0.7);
      ctx.moveTo(gx - diagLen * 0.7, gy + diagLen * 0.7);
      ctx.lineTo(gx + diagLen * 0.7, gy - diagLen * 0.7);
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
