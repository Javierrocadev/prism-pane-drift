import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PRISM_CONFIG,
  evaluatePrismScene,
  PALETTES,
} from "../src/app/prism-pane-drift-model.ts";

test("Prism Pane Drift: seamless loop continuity between t=0 and t=1", () => {
  const sceneStart = evaluatePrismScene(DEFAULT_PRISM_CONFIG, 0.0);
  const sceneEnd = evaluatePrismScene(DEFAULT_PRISM_CONFIG, 1.0);

  assert.equal(sceneStart.orbs.length, sceneEnd.orbs.length);
  for (let i = 0; i < sceneStart.orbs.length; i++) {
    assert.ok(Math.abs(sceneStart.orbs[i].xNorm - sceneEnd.orbs[i].xNorm) < 0.0001);
    assert.ok(Math.abs(sceneStart.orbs[i].yNorm - sceneEnd.orbs[i].yNorm) < 0.0001);
  }

  assert.equal(sceneStart.panes.length, sceneEnd.panes.length);
  for (let i = 0; i < sceneStart.panes.length; i++) {
    assert.ok(Math.abs(sceneStart.panes[i].centerX - sceneEnd.panes[i].centerX) < 0.001);
    assert.ok(Math.abs(sceneStart.panes[i].centerY - sceneEnd.panes[i].centerY) < 0.001);
    assert.ok(Math.abs(sceneStart.panes[i].glintProgress - sceneEnd.panes[i].glintProgress) < 0.001);
  }
});

test("Prism Pane Drift: valid finite coordinates and dimensions", () => {
  const scene = evaluatePrismScene(DEFAULT_PRISM_CONFIG, 0.42, 1920, 1080);
  assert.equal(scene.panes.length, DEFAULT_PRISM_CONFIG.paneCount);
  for (const pane of scene.panes) {
    assert.ok(Number.isFinite(pane.centerX));
    assert.ok(Number.isFinite(pane.centerY));
    assert.ok(pane.width > 0);
    assert.ok(pane.height > 0);
    assert.ok(pane.opacity > 0 && pane.opacity <= 1);
  }
  for (const streak of scene.streaks) {
    assert.ok(streak.offsetNorm >= 0 && streak.offsetNorm <= 1);
    assert.ok(streak.intensity >= 0);
  }
});

test("Prism Pane Drift: all 5 reference palettes exist", () => {
  assert.ok(PALETTES["prism-classic"]);
  assert.ok(PALETTES["cyber-neon"]);
  assert.ok(PALETTES["solar-amber"]);
  assert.ok(PALETTES["emerald-ice"]);
  assert.ok(PALETTES["royal-velvet"]);
});

test("Prism Pane Drift: custom background colors override palette", () => {
  const customConfig = {
    ...DEFAULT_PRISM_CONFIG,
    bgColor: "#010203",
    orbColor1: "#ff0011",
    orbColor2: "#00ff22",
    orbColor3: "#0022ff",
  };
  const scene = evaluatePrismScene(customConfig, 0.5);
  assert.equal(scene.palette.bgDark, "#010203");
  assert.equal(scene.palette.orb2, "#ff0011");
  assert.equal(scene.palette.orb3, "#00ff22");
  assert.equal(scene.palette.orb4, "#0022ff");
});

test("Prism Pane Drift: speed scaling supports ultra-slow controls down to 5% with loop continuity", () => {
  const slowConfig = { ...DEFAULT_PRISM_CONFIG, speed: 0.05 };
  const fastConfig = { ...DEFAULT_PRISM_CONFIG, speed: 1.0 };

  assert.equal(slowConfig.speed, 0.05);
  assert.equal(fastConfig.speed, 1.0);

  const slowStart = evaluatePrismScene(slowConfig, 0.0);
  const slowEnd = evaluatePrismScene(slowConfig, 1.0);
  assert.ok(Math.abs(slowStart.orbs[0].xNorm - slowEnd.orbs[0].xNorm) < 0.0001);
  assert.ok(Math.abs(slowStart.panes[0].centerX - slowEnd.panes[0].centerX) < 0.001);
});

