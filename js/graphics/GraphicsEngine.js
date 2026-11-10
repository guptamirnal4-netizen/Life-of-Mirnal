import { setupGraphics } from '../world/environment.js';
import { RendererManager } from './RendererManager.js';
import { QualityManager } from './QualityManager.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import { DEFAULT_PROFILE } from './GraphicsConfig.js';

// Coordinates the graphics modules around the game's existing renderer, scene and camera. It owns no loop:
// the game's frame() calls update() and render() once per frame.
//
// Camera: there is one perspective camera shared by every view. Player.update() puts it at the eyes
// (first person); the game's updateView() pulls it back on a collision-checked boom (third person, a
// longer boom on the cycle). update() is told which view is active, so view-specific graphics (for
// example a different near plane or depth of field later) have one place to hook in.
export class GraphicsEngine {
  constructor({ renderer, scene, camera, campus }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.rendererManager = new RendererManager(renderer, camera);
    // Sky, sun, fog and image-based lighting follow the game clock (js/world/environment.js).
    this.env = setupGraphics({ renderer, scene, campus });
    this.quality = new QualityManager({ rendererManager: this.rendererManager, scene, sun: this.env.sun });
    this.perf = new PerformanceMonitor(renderer);
    this.view = 'first';
    this.quality.set(DEFAULT_PROFILE);
  }

  setQuality(name) { return this.quality.set(name); }

  // After a world is built (the BITS campus is built the first time College Life starts).
  worldChanged(range) {
    this.env.setRange(range);
    this.quality.applyAnisotropy();
  }

  update(dt, { clock, focus, view = 'first', riding = false }) {
    this.view = riding ? `${view} · cycle` : view;
    this.env.update(dt, { clock, focus });
    this.perf.tick(dt, { quality: this.quality.profile.label, view: this.view });
  }

  render() {
    this.perf.beginRender();
    this.renderer.render(this.scene, this.camera);
    this.perf.endRender();
  }
}
