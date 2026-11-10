import { PROFILES, profileOf } from './GraphicsConfig.js';

// Switches quality profiles at runtime, without a reload: pixel ratio and shadow map type (via the
// RendererManager), the sun's shadow map size and area, texture anisotropy, and the post-processing chain.
export class QualityManager {
  constructor({ rendererManager, scene, sun, post }) {
    this.rm = rendererManager;
    this.post = post;
    this.scene = scene;
    this.sun = sun;
    this.name = null;
  }

  get profile() { return profileOf(this.name); }

  set(name) {
    const key = PROFILES[name] ? name : 'high';
    if (key === this.name) return false;
    const before = this.name && this.profile;
    this.name = key;
    const p = this.profile;
    this.rm.setProfile(p);
    this.post.setProfile(p);
    const sun = this.sun;
    sun.castShadow = p.shadows;
    if (sun.shadow.mapSize.x !== p.shadowMapSize) {
      sun.shadow.mapSize.set(p.shadowMapSize, p.shadowMapSize);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    }
    const c = sun.shadow.camera;
    c.left = -p.shadowSpan / 2; c.right = p.shadowSpan / 2; c.top = p.shadowSpan / 2; c.bottom = -p.shadowSpan / 2;
    c.updateProjectionMatrix();
    // Materials compile shadow code in or out, so they need recompiling when shadows switch on/off or change type.
    if (before && (before.shadows !== p.shadows || before.shadowType !== p.shadowType)) this.recompile();
    this.applyAnisotropy();
    return true;
  }

  // Also called after a new world is built, so its textures get the current setting.
  applyAnisotropy() {
    const a = Math.min(this.profile.anisotropy, this.rm.maxAnisotropy);
    const seen = new Set();
    this.scene.traverse((o) => {
      for (const m of materials(o)) {
        for (const t of [m.map, m.emissiveMap]) {
          if (!t || seen.has(t)) continue;
          seen.add(t);
          if (t.anisotropy !== a) { t.anisotropy = a; t.needsUpdate = true; }
        }
      }
    });
  }

  recompile() {
    this.scene.traverse((o) => { for (const m of materials(o)) m.needsUpdate = true; });
  }
}

const materials = (o) => (!o.material ? [] : Array.isArray(o.material) ? o.material : [o.material]);
