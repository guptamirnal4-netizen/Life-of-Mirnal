import { RENDERER_DEFAULTS, SHADOW_TYPES, pixelRatioFor } from './GraphicsConfig.js';

// Configures the game's existing WebGLRenderer (it never creates a second one): colour management,
// tone mapping, shadow map, pixel ratio and window resizing.
export class RendererManager {
  constructor(renderer, camera) {
    this.renderer = renderer;
    this.camera = camera;
    this.profile = null;
    this.pending = false;
    Object.assign(renderer, RENDERER_DEFAULTS);
    // Resizes are applied once per animation frame, however many resize events arrive.
    window.addEventListener('resize', () => {
      if (this.pending) return;
      this.pending = true;
      requestAnimationFrame(() => { this.pending = false; this.resize(); });
    });
  }

  setProfile(profile) {
    this.profile = profile;
    const sm = this.renderer.shadowMap;
    sm.enabled = profile.shadows;
    sm.type = SHADOW_TYPES[profile.shadowType];
    sm.needsUpdate = true;
    this.resize();
  }

  resize() {
    const w = window.innerWidth; const h = window.innerHeight;
    const pr = pixelRatioFor(this.profile, window.devicePixelRatio || 1, w, h);
    if (this.renderer.getPixelRatio() !== pr) this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  get maxAnisotropy() { return this.renderer.capabilities.getMaxAnisotropy(); }
}
