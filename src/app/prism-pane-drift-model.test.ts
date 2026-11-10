import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRISM_CONFIG,
  evaluatePrismScene,
  PALETTES,
} from "./prism-pane-drift-model";

describe("Prism Pane Drift Mathematical Model", () => {
  it("guarantees seamless loop continuity between t=0 and t=1", () => {
    const sceneStart = evaluatePrismScene(DEFAULT_PRISM_CONFIG, 0.0);
    const sceneEnd = evaluatePrismScene(DEFAULT_PRISM_CONFIG, 1.0);

    expect(sceneStart.orbs.length).toBe(sceneEnd.orbs.length);
    for (let i = 0; i < sceneStart.orbs.length; i++) {
      expect(sceneStart.orbs[i].xNorm).toBeCloseTo(sceneEnd.orbs[i].xNorm, 5);
      expect(sceneStart.orbs[i].yNorm).toBeCloseTo(sceneEnd.orbs[i].yNorm, 5);
    }

    expect(sceneStart.panes.length).toBe(sceneEnd.panes.length);
    for (let i = 0; i < sceneStart.panes.length; i++) {
      expect(sceneStart.panes[i].centerX).toBeCloseTo(sceneEnd.panes[i].centerX, 3);
      expect(sceneStart.panes[i].centerY).toBeCloseTo(sceneEnd.panes[i].centerY, 3);
      expect(sceneStart.panes[i].glintProgress).toBeCloseTo(
        sceneEnd.panes[i].glintProgress,
        3,
      );
    }
  });

  it("produces finite, valid numerical coordinates for all generated elements", () => {
    const scene = evaluatePrismScene(DEFAULT_PRISM_CONFIG, 0.42, 1920, 1080);

    expect(scene.panes.length).toBe(DEFAULT_PRISM_CONFIG.paneCount);
    for (const pane of scene.panes) {
      expect(Number.isFinite(pane.centerX)).toBe(true);
      expect(Number.isFinite(pane.centerY)).toBe(true);
      expect(pane.width).toBeGreaterThan(0);
      expect(pane.height).toBeGreaterThan(0);
      expect(pane.opacity).toBeGreaterThan(0);
      expect(pane.opacity).toBeLessThanOrEqual(1);
    }

    expect(scene.streaks.length).toBeGreaterThan(0);
    for (const streak of scene.streaks) {
      expect(streak.offsetNorm).toBeGreaterThanOrEqual(0);
      expect(streak.offsetNorm).toBeLessThanOrEqual(1);
      expect(streak.intensity).toBeGreaterThanOrEqual(0);
    }
  });

  it("contains all curated reference palettes", () => {
    expect(PALETTES["prism-classic"]).toBeDefined();
    expect(PALETTES["cyber-neon"]).toBeDefined();
    expect(PALETTES["solar-amber"]).toBeDefined();
    expect(PALETTES["emerald-ice"]).toBeDefined();
    expect(PALETTES["royal-velvet"]).toBeDefined();
  });
});
