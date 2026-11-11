import { expect, test } from "@playwright/test";

test("prism loop joins rendered frames before and after editing duration", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas.cursor-grab");
  await expect(canvas).toBeVisible({ timeout: 20_000 });
  const pause = page.getByRole("button", { name: "Pause playback", exact: true });
  if (await pause.isVisible()) await pause.click();
  const position = page.getByRole("slider", { name: "Playback position" });
  if (!(await position.isVisible())) {
    await page.locator('[data-toolcraft-control-target="panels.timeline.extended"]')
      .getByRole("switch").click();
  }
  await expect(position).toBeVisible();
  await expect(page.locator('[data-toolcraft-control-target="atmosphere.speed"]')).toBeVisible();

  const pixels = async () => {
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
    return canvas.evaluate((element: HTMLCanvasElement) => {
      const sample = document.createElement("canvas");
      sample.width = 128;
      sample.height = 96;
      const context = sample.getContext("2d")!;
      context.drawImage(element, 0, 0, sample.width, sample.height);
      return Array.from(context.getImageData(0, 0, sample.width, sample.height).data);
    });
  };
  const difference = (a: number[], b: number[]) =>
    a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0) / a.length;

  for (const duration of [16, 2]) {
    await page.getByRole("button", { name: "Edit timeline duration" }).click();
    const editor = page.getByRole("textbox", { name: "timeline duration", exact: true });
    await editor.fill(`${duration}s`);
    await editor.press("Enter");
    await expect(position).toHaveAttribute("aria-valuemax", String(duration));
    await position.press("Home");
    const start = await pixels();
    if (duration === 16) {
      await canvas.screenshot({ path: ".toolcraft/browser-artifacts/prism-edge.png" });
    }
    await position.press("End");
    expect(await pixels()).toEqual(start);
    await position.press("ArrowLeft");
    // Keyboard scrubbing moves 250ms, not an infinitesimal seam sample.
    expect(difference(start, await pixels())).toBeGreaterThan(0);
    await position.press("Home");
    await position.press("ArrowRight");
    expect(difference(start, await pixels())).toBeGreaterThan(0);
  }
  await expect(page.getByRole("button", { name: "Disable loop", exact: true })).toBeVisible();
  await position.press("End");
  await position.press("ArrowLeft");
  await page.getByRole("button", { name: "Play playback", exact: true }).click();
  await expect.poll(async () => Number(await position.getAttribute("aria-valuenow")))
    .toBeLessThan(1);
  await expect(pause).toBeVisible();
  await pause.click();
});

test("prism speed slider slows down animation while keeping seamless loop", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas.cursor-grab");
  await expect(canvas).toBeVisible({ timeout: 20_000 });
  const pause = page.getByRole("button", { name: "Pause playback", exact: true });
  if (await pause.isVisible()) await pause.click();

  const speedControl = page.locator('[data-toolcraft-control-target="atmosphere.speed"]');
  await expect(speedControl).toBeVisible();

  // Find slider input inside speedControl
  const speedSlider = speedControl.getByRole("slider");
  await expect(speedSlider).toBeVisible();

  // Ensure extended timeline is open to inspect duration
  const position = page.getByRole("slider", { name: "Playback position" });
  if (!(await position.isVisible())) {
    await page.locator('[data-toolcraft-control-target="panels.timeline.extended"]')
      .getByRole("switch").click();
  }
  await expect(position).toBeVisible();

  // Set speed to 50% (slower animation)
  await speedSlider.fill("50");
  await speedSlider.press("Enter");

  // Duration should expand to 32s to complete one slower cycle
  await expect(position).toHaveAttribute("aria-valuemax", "32");

  const pixels = async () => {
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
    return canvas.evaluate((element: HTMLCanvasElement) => {
      const sample = document.createElement("canvas");
      sample.width = 128;
      sample.height = 96;
      const context = sample.getContext("2d")!;
      context.drawImage(element, 0, 0, sample.width, sample.height);
      return Array.from(context.getImageData(0, 0, sample.width, sample.height).data);
    });
  };

  await position.press("Home");
  const startPixels = await pixels();
  await position.press("End");
  const endPixels = await pixels();

  expect(endPixels).toEqual(startPixels);
});

