import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

// The game's look: a warm, saturated, slightly soft "storybook campus" grade with a gentle vignette, and a
// soft glow on bright sky and sunlit walls. It is applied in one final pass that also does the tone mapping
// and the sRGB conversion, so a frame costs one scene render, an optional half-resolution bloom, and one
// full-screen pass. Low quality skips all of it and renders straight to the screen.
const GradeShader = {
  name: 'GradeShader',
  uniforms: {
    tDiffuse: { value: null },
    toneMappingExposure: { value: 1 },
    warmth: { value: 0.05 },
    saturation: { value: 1.12 },
    contrast: { value: 1.08 },
    vignette: { value: 0.26 },
    shadowTint: { value: new THREE.Vector3(-0.012, 0.0, 0.018) },
    highTint: { value: new THREE.Vector3(0.02, 0.008, -0.012) },
  },
  // raw, like three's OutputPass: the chunks below are included once, whatever the renderer's settings
  vertexShader: /* glsl */`
    precision highp float;
    uniform mat4 modelViewMatrix, projectionMatrix;
    attribute vec3 position;
    attribute vec2 uv;
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    precision highp float;
    #include <tonemapping_pars_fragment>
    #include <colorspace_pars_fragment>
    uniform sampler2D tDiffuse;
    uniform float warmth, saturation, contrast, vignette;
    uniform vec3 shadowTint, highTint;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      c *= vec3(1.0 + warmth, 1.0 + warmth * 0.35, 1.0 - warmth * 0.7); // white balance
      c = ACESFilmicToneMapping(c);
      c = sRGBTransferOETF(vec4(c, 1.0)).rgb; // grade in display space
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, saturation);
      c = (c - 0.5) * contrast + 0.5;
      c += shadowTint * (1.0 - smoothstep(0.0, 0.45, l)) + highTint * smoothstep(0.55, 1.0, l);
      vec2 d = vUv - 0.5;
      c *= 1.0 - vignette * smoothstep(0.18, 0.75, dot(d, d) * 2.0);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

// Warmth through the day (game clock in minutes): golden mornings and evenings, neutral midday.
export function gradeFor(clock) {
  const h = clock / 60;
  const golden = Math.max(0, 1 - Math.abs(h - 7) / 1.6) + Math.max(0, Math.min(1, (h - 16) / 2.5));
  return { warmth: 0.04 + 0.07 * Math.min(1, golden), saturation: 1.14 + 0.06 * Math.min(1, golden) };
}

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.composer = null;
    this.key = null;
  }

  get active() { return !!this.composer; }

  // Rebuilds the chain when the profile's post settings change; Low (post: false) tears it down.
  setProfile(p) {
    const key = p.post ? `${p.msaa}|${p.bloom}` : null;
    if (key === this.key) return;
    this.key = key;
    this.dispose();
    if (!p.post) return;
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: p.msaa });
    const composer = new EffectComposer(this.renderer, rt);
    composer.addPass(new RenderPass(this.scene, this.camera));
    if (p.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), p.bloom.strength, p.bloom.radius, p.bloom.threshold);
      composer.addPass(this.bloom);
    }
    this.grade = new ShaderPass(new THREE.RawShaderMaterial({
      name: GradeShader.name, uniforms: THREE.UniformsUtils.clone(GradeShader.uniforms), vertexShader: GradeShader.vertexShader, fragmentShader: GradeShader.fragmentShader,
    }));
    composer.addPass(this.grade);
    this.composer = composer;
    this.resize();
  }

  resize() {
    if (!this.composer) return;
    const r = this.renderer;
    const s = r.getSize(new THREE.Vector2());
    this.composer.setPixelRatio(r.getPixelRatio());
    this.composer.setSize(s.x, s.y);
  }

  update(clock) {
    if (!this.grade) return;
    const g = gradeFor(clock);
    const u = this.grade.uniforms;
    u.warmth.value = g.warmth;
    u.saturation.value = g.saturation;
    u.toneMappingExposure.value = this.renderer.toneMappingExposure;
  }

  // Depth of field, for the campus film's close shots (it renders the scene's depth a second time, so the game
  // itself never uses it): { focus (metres from the camera), aperture, maxblur }, or null to switch it off.
  setDof(dof) {
    if (!this.composer) return;
    if (!dof) { if (this.bokeh) this.bokeh.enabled = false; return; }
    if (!this.bokeh) {
      this.bokeh = new BokehPass(this.scene, this.camera, { focus: 5, aperture: 0.0004, maxblur: 0.005 });
      this.composer.insertPass(this.bokeh, this.composer.passes.indexOf(this.grade));
    }
    const u = this.bokeh.uniforms;
    this.bokeh.enabled = true;
    u.focus.value = dof.focus;
    u.aperture.value = dof.aperture;
    u.maxblur.value = dof.maxblur;
  }

  render() { this.composer.render(); }

  dispose() {
    if (!this.composer) return;
    this.composer.renderTarget1.dispose();
    this.composer.renderTarget2.dispose();
    this.bloom?.dispose();
    this.bokeh?.dispose();
    this.grade?.material.dispose();
    this.composer = null;
    this.bloom = null;
    this.bokeh = null;
    this.grade = null;
  }
}
