import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

// Sky, sun, shadows, fog and quality settings. The sun follows the school clock.
export function setupGraphics({ renderer, scene, campus }) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.56;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const sky = new Sky();
  sky.scale.setScalar(280);
  const u = sky.material.uniforms;
  u.turbidity.value = 3.2;
  u.rayleigh.value = 2.4;
  u.mieCoefficient.value = 0.003;
  u.mieDirectionalG.value = 0.82;
  scene.add(sky);
  scene.background = null;
  scene.fog = new THREE.Fog('#b9cfe0', 90, 270);

  const hemi = new THREE.HemisphereLight('#cfe2ff', '#6d5a3c', 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0d4', 3.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -38; sc.right = 38; sc.top = 38; sc.bottom = -38; sc.near = 1; sc.far = 220;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);

  // Image-based lighting from a copy of the sky (refreshed when the sun moves noticeably).
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new Sky();
  envSky.scale.setScalar(50);
  envScene.add(envSky);
  let envRT = null;
  let envElevation = -999;
  const refreshEnv = (dir) => {
    for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) envSky.material.uniforms[k].value = u[k].value;
    envSky.material.uniforms.sunPosition.value.copy(dir);
    envRT?.dispose();
    envRT = pmrem.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;
  };

  const dir = new THREE.Vector3();
  let quality = null;
  const setQuality = (q) => {
    if (q === quality) return;
    quality = q;
    const high = q !== 'low';
    renderer.setPixelRatio(high ? Math.min(window.devicePixelRatio, 2) : 1);
    renderer.shadowMap.enabled = high;
    sun.castShadow = high;
    scene.traverse((o) => {
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; });
    });
  };

  const sunDirection = (clockMinutes) => {
    const t = THREE.MathUtils.clamp((clockMinutes - 6 * 60) / (12 * 60), 0.02, 0.98);
    const elevation = THREE.MathUtils.degToRad(8 + Math.sin(t * Math.PI) * 64);
    const azimuth = THREE.MathUtils.degToRad(105 + t * 150);
    return dir.set(Math.cos(elevation) * Math.sin(azimuth), Math.sin(elevation), Math.cos(elevation) * Math.cos(azimuth)).normalize();
  };

  const world = () => (typeof campus === 'function' ? campus() : campus);
  // Draw distance per world: the school is small, the real BITS campus is ~1.8 km long.
  let range = { fogNear: scene.fog.near, fogFar: scene.fog.far };
  const setRange = ({ fogNear, fogFar, skyScale }) => {
    range = { fogNear, fogFar };
    scene.fog.near = fogNear;
    scene.fog.far = fogFar;
    sky.scale.setScalar(skyScale);
  };

  const update = (dt, { clock = 10 * 60, focus = null, quality: q = 'high' } = {}) => {
    setQuality(q);
    const d = sunDirection(clock);
    u.sunPosition.value.copy(d);
    const elevationDeg = THREE.MathUtils.radToDeg(Math.asin(d.y));
    if (Math.abs(elevationDeg - envElevation) > 4) {
      envElevation = elevationDeg;
      refreshEnv(d);
    }
    sun.intensity = 0.9 + 2.1 * Math.min(1, d.y * 1.6);
    sun.color.setHSL(0.1, 0.6, 0.78 + 0.18 * Math.min(1, d.y * 1.5));
    const f = focus || new THREE.Vector3();
    // Snap the shadow frustum to texels so shadows don't shimmer while walking.
    const step = 76 / 2048;
    const fx = Math.round(f.x / step) * step;
    const fz = Math.round(f.z / step) * step;
    sun.target.position.set(fx, 0, fz);
    sun.position.set(fx + d.x * 90, d.y * 90, fz + d.z * 90);
    sky.position.set(f.x, 0, f.z);
    // Lift the fog with the viewer so aerial views stay clear; walking views are unchanged.
    const lift = Math.max(0, f.y - 10);
    scene.fog.near = range.fogNear + lift;
    scene.fog.far = range.fogFar + lift * 1.6;
    world().update?.(dt, f);
  };

  return { sun, sky, hemi, update, setQuality, setRange };
}
