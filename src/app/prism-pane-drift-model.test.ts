import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRISM_CONFIG,
  evaluatePrismScene,
  extractPrismConfig,
  PALETTES,
} from "./prism-pane-drift-model";

describe("Prism Pane Drift Mathematical Model", () => {
  it("uses one complete timeline cycle even with a previously saved speed", () => {
    const config = extractPrismConfig({ "atmosphere.speed": 50 });
    expect(config.speed).toBe(0.5);
    expect(evaluatePrismScene(config, 0)).toEqual(evaluatePrismScene(config, 1));
    expect(evaluatePrismScene(config, 0.25).timeNormalized).toBe(0.25);
  });

  it("approaches the starting scene continuously before the timeline wraps", () => {
    const start = evaluatePrismScene(DEFAULT_PRISM_CONFIG, 0);
    const end = evaluatePrismScene(DEFAULT_PRISM_CONFIG, 1 - 1e-7);
    const circularDistance = (a: number, b: number) =>
      Math.min(Math.abs(a - b), 1 - Math.abs(a - b));

    start.orbs.forEach((orb, i) => {
      expect(end.orbs[i].xNorm).toBeCloseTo(orb.xNorm, 5);
      expect(end.orbs[i].yNorm).toBeCloseTo(orb.yNorm, 5);
    });
    start.panes.forEach((pane, i) => {
      expect(end.panes[i].centerX).toBeCloseTo(pane.centerX, 3);
      expect(end.panes[i].centerY).toBeCloseTo(pane.centerY, 3);
      expect(circularDistance(end.panes[i].glintProgress, pane.glintProgress)).toBeLessThan(1e-5);
      expect(end.panes[i].glintIntensity).toBeCloseTo(pane.glintIntensity, 5);
    });
    start.streaks.forEach((streak, i) => {
      expect(circularDistance(end.streaks[i].offsetNorm, streak.offsetNorm)).toBeLessThan(1e-5);
      expect(end.streaks[i].intensity).toBeCloseTo(streak.intensity, 5);
    });
  });

  it("fades glints out where their open edge path wraps", () => {
    for (let frame = 0; frame < 1000; frame++) {
      const scene = evaluatePrismScene(DEFAULT_PRISM_CONFIG, frame / 1000);
      for (const pane of scene.panes) {
        if (pane.glintProgress < 0.001 || pane.glintProgress > 0.999) {
          expect(pane.glintIntensity).toBeLessThan(0.001);
        }
      }
    }
  });

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

  it("extracts custom glassColor or falls back to default #7828b4", () => {
    const configDefault = extractPrismConfig({});
    expect(configDefault.glassColor).toBe("#7828b4");

    const configCustom = extractPrismConfig({ "optics.glassColor": "#00d2a0" });
    expect(configCustom.glassColor).toBe("#00d2a0");

    const configCustomObj = extractPrismConfig({ "optics.glassColor": { hex: "#ff901a" } });
    expect(configCustomObj.glassColor).toBe("#ff901a");
  });
});
