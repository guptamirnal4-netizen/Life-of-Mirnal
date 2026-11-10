// Frame-rate and frame-time diagnostics. Each frame only stores two numbers in a ring buffer; the
// summary (FPS, average and 95th-percentile frame time, render cost, draw calls) is worked out and
// drawn twice a second, and only while the overlay is visible or someone asks for it.
const N = 240;

export class PerformanceMonitor {
  constructor(renderer) {
    this.renderer = renderer;
    this.frame = new Float32Array(N); // ms between frames
    this.cpu = new Float32Array(N); // ms spent in render()
    this.i = 0;
    this.count = 0;
    this.last = 0;
    this.t0 = 0;
    this.timer = 0;
    this.el = null;
    this.visible = false;
    this.lastStats = null;
  }

  beginRender() { this.t0 = performance.now(); }

  endRender() {
    const now = performance.now();
    if (this.last) {
      this.frame[this.i] = now - this.last;
      this.cpu[this.i] = now - this.t0;
      this.i = (this.i + 1) % N;
      this.count = Math.min(N, this.count + 1);
    }
    this.last = now;
  }

  tick(dt, extra) {
    this.timer += dt;
    if (!this.visible || this.timer < 0.5) return;
    this.timer = 0;
    this.draw(extra);
  }

  stats() {
    const n = this.count;
    if (!n) return null;
    const f = Array.from(this.frame.subarray(0, n)).sort((a, b) => a - b);
    let sum = 0; let cpu = 0;
    for (let k = 0; k < n; k++) { sum += this.frame[k]; cpu += this.cpu[k]; }
    const info = this.renderer.info;
    this.lastStats = {
      fps: 1000 / (sum / n),
      frameMs: sum / n,
      p95Ms: f[Math.floor(n * 0.95)],
      renderMs: cpu / n,
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      pixelRatio: this.renderer.getPixelRatio(),
    };
    return this.lastStats;
  }

  setVisible(on) {
    this.visible = on;
    if (on && !this.el) {
      this.el = document.createElement('pre');
      this.el.id = 'perf-hud';
      this.el.style.cssText = 'position:fixed;right:10px;bottom:46px;z-index:30;margin:0;padding:6px 9px;border-radius:6px;background:rgba(10,14,20,0.72);color:#d8f3dc;font:11px/1.45 ui-monospace,Menlo,monospace;pointer-events:none;white-space:pre';
      document.body.appendChild(this.el);
    }
    if (this.el) this.el.style.display = on ? 'block' : 'none';
    if (on) this.draw();
  }

  draw(extra = {}) {
    const s = this.stats();
    if (!this.el || !s) return;
    const c = this.renderer.domElement;
    this.el.textContent = [
      `${s.fps.toFixed(0)} fps · ${s.frameMs.toFixed(1)} ms (p95 ${s.p95Ms.toFixed(1)})`,
      `render ${s.renderMs.toFixed(1)} ms · ${s.calls} draws · ${(s.triangles / 1000).toFixed(0)}k tris`,
      `${c.width}×${c.height} @ ${s.pixelRatio.toFixed(2)}x · ${extra.quality || ''}`,
      `geo ${s.geometries} · tex ${s.textures}${extra.view ? ` · ${extra.view}` : ''}`,
    ].join('\n');
  }
}
