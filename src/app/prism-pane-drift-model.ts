/**
 * Prism Pane Drift - Mathematical Model & Deterministic Loop Engine
 * Inspired by refractive frosted glass panes, specular edge glints, and vibrant aurora mesh gradients.
 */

export const TAU = Math.PI * 2;

export interface PaletteTheme {
  name: string;
  id: string;
  bgDark: string;
  orb1: string; // Base deep magenta / violet
  orb2: string; // Vibrant accent
  orb3: string; // Warm highlight
  orb4: string; // Secondary electric accent
  glintColor: string;
  streakColor: string;
}

export const PALETTES: Record<string, PaletteTheme> = {
  "prism-classic": {
    id: "prism-classic",
    name: "Prism Classic (Reference)",
    bgDark: "#100624",
    orb1: "#2a0845",
    orb2: "#d91b7e",
    orb3: "#ff901a",
    orb4: "#6415ff",
    glintColor: "#ffffff",
    streakColor: "rgba(255, 140, 220, 0.6)",
  },
  "cyber-neon": {
    id: "cyber-neon",
    name: "Cyber Neon",
    bgDark: "#050814",
    orb1: "#0b194f",
    orb2: "#00f0ff",
    orb3: "#ff007f",
    orb4: "#7928ca",
    glintColor: "#e0ffff",
    streakColor: "rgba(0, 240, 255, 0.7)",
  },
  "solar-amber": {
    id: "solar-amber",
    name: "Solar Amber",
    bgDark: "#1f0c05",
    orb1: "#571604",
    orb2: "#ff4500",
    orb3: "#ffbb00",
    orb4: "#ff0055",
    glintColor: "#fff4d0",
    streakColor: "rgba(255, 200, 100, 0.6)",
  },
  "emerald-ice": {
    id: "emerald-ice",
    name: "Emerald Ice",
    bgDark: "#031412",
    orb1: "#06302b",
    orb2: "#00d2a0",
    orb3: "#00e5ff",
    orb4: "#4facfe",
    glintColor: "#e6ffff",
    streakColor: "rgba(0, 229, 255, 0.6)",
  },
  "royal-velvet": {
    id: "royal-velvet",
    name: "Royal Velvet",
    bgDark: "#120524",
    orb1: "#3c096c",
    orb2: "#7b2cbf",
    orb3: "#c77dff",
    orb4: "#e0aaff",
    glintColor: "#ffffff",
    streakColor: "rgba(224, 170, 255, 0.6)",
  },
};

export interface PrismConfig {
  paneCount: number;
  angleDeg: number;
  paneScale: number;
  cornerRadius: number;
  refractionStrength: number;
  chromaticAberration: number;
  edgeGlow: number;
  streakDensity: number;
  glassOpacity: number;
  speed: number;
  paletteKey: string;
  grainIntensity: number;
}

export const DEFAULT_PRISM_CONFIG: PrismConfig = {
  paneCount: 6,
  angleDeg: 45,
  paneScale: 1.0,
  cornerRadius: 8,
  refractionStrength: 45,
  chromaticAberration: 8,
  edgeGlow: 75,
  streakDensity: 8,
  glassOpacity: 0.32,
  speed: 1.0,
  paletteKey: "prism-classic",
  grainIntensity: 18,
};

export interface GlassPaneData {
  id: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  angle: number;
  depth: number;
  opacity: number;
  glintProgress: number;
  glintIntensity: number;
  bevelWidth: number;
  refractionOffsetX: number;
  refractionOffsetY: number;
}

export interface LightStreakData {
  offsetNorm: number;
  thickness: number;
  intensity: number;
  speedMultiplier: number;
}

export interface AuroraOrbData {
  xNorm: number;
  yNorm: number;
  radiusNorm: number;
  color: string;
  intensity: number;
}

export interface EvaluatedScene {
  orbs: AuroraOrbData[];
  panes: GlassPaneData[];
  streaks: LightStreakData[];
  palette: PaletteTheme;
  timeNormalized: number;
}

/**
 * Pure deterministic mathematical evaluation function.
 * Given normalized loop time t in [0, 1), produces exact visual coordinates.
 * Guaranteed seamless periodic closure: evaluate(state, 0) == evaluate(state, 1).
 */
export function evaluatePrismScene(
  config: PrismConfig,
  t: number,
  viewWidth = 1200,
  viewHeight = 800,
): EvaluatedScene {
  const normT = ((t % 1) + 1) % 1;
  const palette = PALETTES[config.paletteKey] ?? PALETTES["prism-classic"];

  // 1. Dynamic Aurora Orbs (Smooth periodic Fourier harmonics)
  const orbs: AuroraOrbData[] = [
    {
      xNorm: 0.3 + 0.15 * Math.sin(TAU * normT) + 0.05 * Math.sin(TAU * 2 * normT),
      yNorm: 0.65 + 0.12 * Math.cos(TAU * normT) + 0.04 * Math.cos(TAU * 2 * normT),
      radiusNorm: 0.55,
      color: palette.orb1,
      intensity: 0.9,
    },
    {
      xNorm: 0.55 + 0.18 * Math.cos(TAU * normT + 1.2) - 0.06 * Math.sin(TAU * 2 * normT),
      yNorm: 0.45 + 0.15 * Math.sin(TAU * normT + 0.8),
      radiusNorm: 0.48,
      color: palette.orb2,
      intensity: 0.95,
    },
    {
      xNorm: 0.82 + 0.1 * Math.sin(TAU * normT + 2.4),
      yNorm: 0.28 + 0.1 * Math.cos(TAU * normT + 1.6),
      radiusNorm: 0.42,
      color: palette.orb3,
      intensity: 1.0,
    },
    {
      xNorm: 0.2 + 0.12 * Math.cos(TAU * normT + 3.1),
      yNorm: 0.25 + 0.12 * Math.sin(TAU * normT + 2.0),
      radiusNorm: 0.38,
      color: palette.orb4,
      intensity: 0.85,
    },
  ];

  // 2. Light Streaks (fine 45-degree ray lines)
  const streaks: LightStreakData[] = [];
  const streakCount = Math.max(2, Math.min(24, Math.round(config.streakDensity)));
  for (let i = 0; i < streakCount; i++) {
    const baseOffset = i / streakCount;
    const speedMult = 1 + (i % 3) * 0.5;
    const offsetNorm = (baseOffset + normT * 0.2 * speedMult) % 1;
    const pulse = 0.5 + 0.5 * Math.sin(TAU * (normT * 2 + i * 0.7));
    streaks.push({
      offsetNorm,
      thickness: 1 + (i % 2) * 1.5,
      intensity: (0.35 + 0.65 * pulse) * (config.edgeGlow / 100),
      speedMultiplier: speedMult,
    });
  }

  // 3. Glass Panes
  const panes: GlassPaneData[] = [];
  const count = Math.max(1, Math.min(12, Math.round(config.paneCount)));
  const angleRad = (config.angleDeg * Math.PI) / 180;
  const perpRad = angleRad + Math.PI / 2;

  // Preset pane layouts anchored along diagonal waves
  const basePaneTemplates = [
    { u: 0.22, v: 0.55, w: 260, h: 360, depth: 1.0, phase: 0.0 },
    { u: 0.48, v: 0.62, w: 320, h: 420, depth: 1.15, phase: 0.25 },
    { u: 0.68, v: 0.38, w: 380, h: 480, depth: 1.3, phase: 0.5 },
    { u: 0.35, v: 0.28, w: 240, h: 310, depth: 0.85, phase: 0.75 },
    { u: 0.82, v: 0.72, w: 280, h: 340, depth: 1.05, phase: 0.15 },
    { u: 0.15, v: 0.82, w: 220, h: 290, depth: 0.75, phase: 0.65 },
    { u: 0.88, v: 0.22, w: 290, h: 350, depth: 1.1, phase: 0.4 },
    { u: 0.52, v: 0.18, w: 210, h: 260, depth: 0.9, phase: 0.85 },
  ];

  for (let i = 0; i < count; i++) {
    const tmpl = basePaneTemplates[i % basePaneTemplates.length];
    const loopPhase = normT + tmpl.phase;

    // Gentle floating motion along perpendicular and diagonal axes
    const travelDistance = 70 * tmpl.depth * config.paneScale;
    const deltaParallel = Math.sin(TAU * loopPhase) * travelDistance;
    const deltaPerp = Math.cos(TAU * loopPhase) * (travelDistance * 0.4);

    const baseCenterX = tmpl.u * viewWidth;
    const baseCenterY = tmpl.v * viewHeight;

    const centerX =
      baseCenterX +
      deltaParallel * Math.cos(angleRad) +
      deltaPerp * Math.cos(perpRad);
    const centerY =
      baseCenterY +
      deltaParallel * Math.sin(angleRad) +
      deltaPerp * Math.sin(perpRad);

    const width = tmpl.w * config.paneScale;
    const height = tmpl.h * config.paneScale;

    // Specular glint travel along the top/right perimeter
    const glintProgress = (loopPhase * 1.5) % 1;
    const glintIntensity =
      Math.pow(0.5 + 0.5 * Math.sin(TAU * loopPhase * 2), 3) *
      (config.edgeGlow / 100);

    // Refraction offset vector
    const refractionDist = (config.refractionStrength / 100) * 18 * tmpl.depth;
    const refractionAngle = angleRad + Math.PI / 4;
    const refractionOffsetX = Math.cos(refractionAngle) * refractionDist;
    const refractionOffsetY = Math.sin(refractionAngle) * refractionDist;

    panes.push({
      id: i,
      centerX,
      centerY,
      width,
      height,
      angle: angleRad,
      depth: tmpl.depth,
      opacity: Math.min(1, Math.max(0.05, config.glassOpacity * tmpl.depth)),
      glintProgress,
      glintIntensity,
      bevelWidth: Math.max(1, 3 * tmpl.depth),
      refractionOffsetX,
      refractionOffsetY,
    });
  }

  // Sort back-to-front by depth
  panes.sort((a, b) => a.depth - b.depth);

  return {
    orbs,
    panes,
    streaks,
    palette,
    timeNormalized: normT,
  };
}
