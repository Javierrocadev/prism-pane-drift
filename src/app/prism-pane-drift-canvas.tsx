import * as React from "react";
import {
  DEFAULT_PRISM_CONFIG,
  evaluatePrismScene,
  PALETTES,
  type PrismConfig,
} from "./prism-pane-drift-model";
import { renderPrismScene } from "./prism-pane-drift-renderer";

export function PrismPaneDriftCanvas(): React.JSX.Element {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const [config, setConfig] = React.useState<PrismConfig>(DEFAULT_PRISM_CONFIG);
  const [isPlaying, setIsPlaying] = React.useState<boolean>(true);
  const [loopTime, setLoopTime] = React.useState<number>(0);
  const [panelOpen, setPanelOpen] = React.useState<boolean>(true);

  const animFrameRef = React.useRef<number | null>(null);
  const lastTimeRef = React.useRef<number>(performance.now());
  const loopDurationMs = 6000 / Math.max(0.1, config.speed);

  // Animation Loop
  React.useEffect(() => {
    let active = true;

    const tick = (now: number) => {
      if (!active) return;
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (isPlaying) {
        setLoopTime((prev) => (prev + delta / loopDurationMs) % 1);
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, loopDurationMs]);

  // Render to Canvas
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 700;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    const scene = evaluatePrismScene(config, loopTime, width, height);
    renderPrismScene(ctx, scene, config, width, height);

    ctx.restore();
  }, [config, loopTime]);

  // Export current frame as PNG
  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `prism-pane-drift-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const updateConfig = <K extends keyof PrismConfig>(key: K, value: PrismConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[500px] overflow-hidden select-none bg-slate-950 font-sans"
    >
      {/* Visual Canvas Viewport */}
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Floating Transport Bar (Bottom Center) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 rounded-full bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl z-20">
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all text-sm font-semibold active:scale-95"
          title={isPlaying ? "Pausar" : "Reproducir"}
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>

        {/* Time Scrubber */}
        <div className="flex items-center gap-2 w-48 sm:w-64">
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={loopTime}
            onChange={(e) => {
              setIsPlaying(false);
              setLoopTime(parseFloat(e.target.value));
            }}
            className="w-full accent-fuchsia-500 cursor-pointer h-1.5 bg-white/20 rounded-lg"
          />
          <span className="text-[11px] font-mono text-slate-300 w-10 text-right">
            {(loopTime * 100).toFixed(0)}%
          </span>
        </div>

        <button
          type="button"
          onClick={() => setPanelOpen(!panelOpen)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            panelOpen
              ? "bg-fuchsia-600/80 text-white shadow-lg shadow-fuchsia-500/20"
              : "bg-white/10 text-slate-200 hover:bg-white/20"
          }`}
        >
          {panelOpen ? "Ocultar Controles" : "Ajustes"}
        </button>

        <button
          type="button"
          onClick={handleExportPng}
          className="px-3 py-1.5 rounded-full bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-medium transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          title="Exportar fotograma como imagen PNG"
        >
          Exportar PNG
        </button>
      </div>

      {/* Floating Interactive Settings Sidebar */}
      {panelOpen && (
        <aside className="absolute top-4 right-4 w-80 max-h-[calc(100%-6rem)] overflow-y-auto rounded-2xl bg-slate-950/85 backdrop-blur-2xl border border-white/10 shadow-2xl p-5 text-slate-200 z-30 flex flex-col gap-4 text-xs scrollbar-thin">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">
                Prism Pane Drift
              </h2>
              <p className="text-[10px] text-slate-400">
                Paneles de cristal, refracción y destellos
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfig(DEFAULT_PRISM_CONFIG)}
              className="text-[10px] text-fuchsia-400 hover:text-fuchsia-300 hover:underline"
            >
              Resetear
            </button>
          </div>

          {/* Preset Palettes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-300">
              Paleta Cromática
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(PALETTES).map(([key, pal]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateConfig("paletteKey", key)}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                    config.paletteKey === key
                      ? "border-fuchsia-500 bg-fuchsia-500/15 text-white"
                      : "border-white/5 bg-white/5 hover:bg-white/10 text-slate-300"
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow"
                    style={{ background: pal.orb2 }}
                  />
                  <span className="truncate text-[10px]">{pal.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Geometry Section */}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Geometría & Orientación
            </span>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Paneles de Cristal</span>
                <span className="font-mono text-slate-400">{config.paneCount}</span>
              </div>
              <input
                type="range"
                min={2}
                max={10}
                step={1}
                value={config.paneCount}
                onChange={(e) => updateConfig("paneCount", parseInt(e.target.value, 10))}
                className="accent-fuchsia-500 cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Ángulo Diagonal</span>
                <span className="font-mono text-slate-400">{config.angleDeg}°</span>
              </div>
              <input
                type="range"
                min={15}
                max={75}
                step={1}
                value={config.angleDeg}
                onChange={(e) => updateConfig("angleDeg", parseFloat(e.target.value))}
                className="accent-fuchsia-500 cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Escala</span>
                <span className="font-mono text-slate-400">{config.paneScale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.6}
                step={0.05}
                value={config.paneScale}
                onChange={(e) => updateConfig("paneScale", parseFloat(e.target.value))}
                className="accent-fuchsia-500 cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Bisel / Esquinas</span>
                <span className="font-mono text-slate-400">{config.cornerRadius}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={24}
                step={1}
                value={config.cornerRadius}
                onChange={(e) => updateConfig("cornerRadius", parseInt(e.target.value, 10))}
                className="accent-fuchsia-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Optics & Glass Physics */}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Óptica & Refracción
            </span>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Fuerza de Refracción</span>
                <span className="font-mono text-slate-400">{config.refractionStrength}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={config.refractionStrength}
                onChange={(e) => updateConfig("refractionStrength", parseInt(e.target.value, 10))}
                className="accent-fuchsia-500 cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Aberración Cromática (RGB)</span>
                <span className="font-mono text-slate-400">{config.chromaticAberration}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={16}
                step={1}
                value={config.chromaticAberration}
                onChange={(e) => updateConfig("chromaticAberration", parseInt(e.target.value, 10))}
                className="accent-fuchsia-500 cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Opacidad del Cristal</span>
                <span className="font-mono text-slate-400">
                  {Math.round(config.glassOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={0.8}
                step={0.02}
                value={config.glassOpacity}
                onChange={(e) => updateConfig("glassOpacity", parseFloat(e.target.value))}
                className="accent-fuchsia-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Light & Edge Glints */}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Destellos & Rayos de Luz
            </span>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Brillo de Cantos (Glow)</span>
                <span className="font-mono text-slate-400">{config.edgeGlow}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={1}
                value={config.edgeGlow}
                onChange={(e) => updateConfig("edgeGlow", parseInt(e.target.value, 10))}
                className="accent-fuchsia-500 cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Haces de Luz Láser</span>
                <span className="font-mono text-slate-400">{config.streakDensity}</span>
              </div>
              <input
                type="range"
                min={0}
                max={16}
                step={1}
                value={config.streakDensity}
                onChange={(e) => updateConfig("streakDensity", parseInt(e.target.value, 10))}
                className="accent-fuchsia-500 cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Grano Analógico</span>
                <span className="font-mono text-slate-400">{config.grainIntensity}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                step={2}
                value={config.grainIntensity}
                onChange={(e) => updateConfig("grainIntensity", parseInt(e.target.value, 10))}
                className="accent-fuchsia-500 cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Velocidad del Loop</span>
                <span className="font-mono text-slate-400">{config.speed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={2.5}
                step={0.1}
                value={config.speed}
                onChange={(e) => updateConfig("speed", parseFloat(e.target.value))}
                className="accent-fuchsia-500 cursor-pointer"
              />
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
