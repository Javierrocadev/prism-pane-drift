import * as React from "react";
import { composeToolcraftApp } from "@/toolcraft/runtime/react";

import { appSchema } from "./app-schema";
import { PrismPaneDriftCanvas } from "./prism-pane-drift-canvas";
import {
  evaluatePrismScene,
  extractPrismConfig,
} from "./prism-pane-drift-model";
import { renderPrismScene } from "./prism-pane-drift-renderer";

export const appComposition = composeToolcraftApp(appSchema, {
  scene: {
    canvasContent: <PrismPaneDriftCanvas />,
    rasterFrameRenderer: {
      baseFileName: "prism-pane-drift",
      renderFrame: ({ context, frame, timelineProgress, state }) => {
        const config = extractPrismConfig(state.values);
        const scene = evaluatePrismScene(
          config,
          timelineProgress,
          frame.width,
          frame.height,
        );
        context.save();
        context.translate(frame.x, frame.y);
        renderPrismScene(context, scene, config, frame.width, frame.height);
        context.restore();
      },
    },
  },
});
