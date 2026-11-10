import * as React from "react";
import { composeToolcraftApp } from "@/toolcraft/runtime/react";

import { appSchema } from "./app-schema";
import { PrismPaneDriftCanvas } from "./prism-pane-drift-canvas";
import { evaluatePrismScene, DEFAULT_PRISM_CONFIG } from "./prism-pane-drift-model";
import { renderPrismScene } from "./prism-pane-drift-renderer";

export const appComposition = composeToolcraftApp(appSchema, {
  scene: {
    canvasContent: <PrismPaneDriftCanvas />,
    rasterFrameRenderer: {
      baseFileName: "prism-pane-drift",
      renderFrame: ({ context: ctx, frame, timelineProgress }) => {
        const w = frame.width;
        const h = frame.height;
        const scene = evaluatePrismScene(DEFAULT_PRISM_CONFIG, timelineProgress, w, h);
        renderPrismScene(ctx, scene, DEFAULT_PRISM_CONFIG, w, h);
      },
    },
  },
});
