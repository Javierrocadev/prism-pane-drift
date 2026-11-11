import { describe, expect, it } from "vitest";
import { DEFAULT_PRISM_CONFIG, evaluatePrismScene } from "./prism-pane-drift-model";
import { renderPrismScene } from "./prism-pane-drift-renderer";

type Gradient = { stops: [number, string][]; addColorStop: (position: number, color: string) => void };

function recordStrokes(glintIntensity = 0) {
  const strokes: { style: string | Gradient; width: number; alpha: number }[] = [];
  const stack: Record<string, unknown>[] = [];
  const state: Record<string, unknown> = { globalAlpha: 1, lineWidth: 1 };
  const gradient = (): Gradient => {
    const stops: [number, string][] = [];
    return { stops, addColorStop: (position, color) => { stops.push([position, color]); } };
  };
  const context = new Proxy(state, {
    get(target, key: string) {
      if (key === "createLinearGradient" || key === "createRadialGradient") return gradient;
      if (key === "save") return () => stack.push({ ...target });
      if (key === "restore") return () => Object.assign(target, stack.pop());
      if (key === "stroke") return () => strokes.push({
        style: target.strokeStyle as string | Gradient,
        width: target.lineWidth as number,
        alpha: target.globalAlpha as number,
      });
      return key in target ? target[key] : () => undefined;
    },
  }) as unknown as CanvasRenderingContext2D;
  const config = { ...DEFAULT_PRISM_CONFIG, paneCount: 1, grainIntensity: 0 };
  const scene = evaluatePrismScene(config, 0);
  scene.orbs = [];
  scene.streaks = [];
  scene.panes[0].glintIntensity = glintIntensity;
  renderPrismScene(context, scene, config, 600, 600);
  return strokes;
}

describe("Prism glass edge integration", () => {
  it("tapers both edge-light passes to transparency instead of using solid strokes", () => {
    const edgeStrokes = recordStrokes().slice(-2);
    expect(edgeStrokes).toHaveLength(2);
    for (const { style } of edgeStrokes) {
      expect(typeof style).toBe("object");
      const stops = (style as Gradient).stops;
      expect(stops[0]).toEqual([0, "transparent"]);
      expect(stops.at(-1)).toEqual([1, "transparent"]);
    }
    expect(edgeStrokes[1].alpha).toBeLessThanOrEqual(0.3);
    expect(edgeStrokes[1].width).toBeLessThan(1);
  });

  it("attenuates the moving highlight with its evaluated intensity", () => {
    const glint = recordStrokes(0.2).at(-1)!;
    expect(glint.alpha).toBeGreaterThan(0);
    expect(glint.alpha).toBeLessThanOrEqual(0.2);
    expect(glint.width).toBeLessThan(1);
  });

  it("renders light streaks with subtle attenuated opacity and smooth transparency tapers", () => {
    const strokes: { style: string | Gradient; width: number; alpha: number }[] = [];
    const stack: Record<string, unknown>[] = [];
    const state: Record<string, unknown> = { globalAlpha: 1, lineWidth: 1 };
    const gradient = (): Gradient => {
      const stops: [number, string][] = [];
      return { stops, addColorStop: (position, color) => { stops.push([position, color]); } };
    };
    const context = new Proxy(state, {
      get(target, key: string) {
        if (key === "createLinearGradient" || key === "createRadialGradient") return gradient;
        if (key === "save") return () => stack.push({ ...target });
        if (key === "restore") return () => Object.assign(target, stack.pop());
        if (key === "stroke") return () => strokes.push({
          style: target.strokeStyle as string | Gradient,
          width: target.lineWidth as number,
          alpha: target.globalAlpha as number,
        });
        return key in target ? target[key] : () => undefined;
      },
    }) as unknown as CanvasRenderingContext2D;
    const config = { ...DEFAULT_PRISM_CONFIG, paneCount: 0, streakDensity: 4, grainIntensity: 0 };
    const scene = evaluatePrismScene(config, 0);
    scene.orbs = [];
    scene.panes = [];
    renderPrismScene(context, scene, config, 600, 600);

    expect(strokes.length).toBeGreaterThan(0);
    for (const stroke of strokes) {
      expect(stroke.alpha).toBeLessThanOrEqual(0.6);
      expect(typeof stroke.style).toBe("object");
      const stops = (stroke.style as Gradient).stops;
      expect(stops[0]).toEqual([0, "transparent"]);
      expect(stops.at(-1)).toEqual([1, "transparent"]);
    }
  });
});
