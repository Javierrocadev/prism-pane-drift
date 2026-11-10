import * as React from "react";
import { composeToolcraftApp } from "@/toolcraft/runtime/react";

import { appSchema } from "./app-schema";
import { PrismPaneDriftCanvas } from "./prism-pane-drift-canvas";
import { evaluatePrismScene, DEFAULT_PRISM_CONFIG } from "./prism-pane-drift-model";
import { renderPrismScene } from "./prism-pane-drift-renderer";

export const appComposition = composeToolcraftApp(appSchema, {
  scene: {
    canvasContent: <PrismPaneDriftCanvas />,
  },
});

