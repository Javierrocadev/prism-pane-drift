import * as React from "react";
import {
  evaluatePrismScene,
  extractPrismConfig,
} from "./prism-pane-drift-model";
import { renderPrismScene } from "./prism-pane-drift-renderer";
import { getToolcraftTimelineLoopProgress } from "@/toolcraft/runtime";
import {
  useToolcraftDispatch,
  useToolcraftEvaluatedValues,
  useToolcraftSelector,
} from "@/toolcraft/runtime/react";

export function PrismPaneDriftCanvas(): React.JSX.Element {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const dispatch = useToolcraftDispatch();

  // Read native Toolcraft values and timeline state
  const values = useToolcraftEvaluatedValues();
  const timeline = useToolcraftSelector((state) => state.timeline);

  const config = React.useMemo(() => {
    return extractPrismConfig(values);
  }, [values]);

  // Synchronize speed control with timeline loop duration to preserve seamless cycle
  const prevSpeedRef = React.useRef(config.speed);
  React.useEffect(() => {
    if (config.speed && config.speed !== prevSpeedRef.current) {
      prevSpeedRef.current = config.speed;
      const baseDuration = 16;
      const targetDuration = Math.max(1, Math.round(baseDuration / config.speed));
      dispatch({ durationSeconds: targetDuration, type: "timeline.setDuration" });
    }
  }, [config.speed, dispatch]);

  const loopProgress = getToolcraftTimelineLoopProgress(timeline);
  const sizeRef = React.useRef({ width: 1000, height: 700, dpr: 1 });

  // Manage canvas backing buffer dimensions only when container actually resizes
  React.useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const width = container.clientWidth || 1000;
      const height = container.clientHeight || 700;
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

      sizeRef.current = { width, height, dpr };

      const pixelWidth = Math.floor(width * dpr);
      const pixelHeight = Math.floor(height * dpr);

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
    };

    updateSize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        updateSize();
      });
      observer.observe(container);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Fluid render to Canvas on parameter changes or timeline ticks without layout thrashing
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height, dpr } = sizeRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    const scene = evaluatePrismScene(config, loopProgress, width, height);
    renderPrismScene(ctx, scene, config, width, height);

    ctx.restore();
  }, [config, loopProgress]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[500px] overflow-hidden select-none bg-slate-950 font-sans"
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-grab active:cursor-grabbing"
      />
    </div>
  );
}
