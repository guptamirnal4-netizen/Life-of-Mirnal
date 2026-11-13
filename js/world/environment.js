import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

// Sky, sun, shadows and fog. The sun follows the school clock. Renderer settings, shadow map size and
// quality profiles are in js/graphics/.
export function setupGraphics({ renderer, scene, campus }) {
  const sky = new Sky();
  sky.scale.setScalar(280);
  const u = sky.material.uniforms;
  u.turbidity.value = 1.6;
  u.rayleigh.value = 0.7;
  u.mieCoefficient.value = 0.002;
  u.mieDirectionalG.value = 0.82;
  scene.add(sky);
  const clouds = cloudLayer();
  sky.add(clouds); // follows the sky's position and scale
  scene.background = null;
  scene.fog = new THREE.Fog('#b9cfe0', 90, 270);

  const hemi = new THREE.HemisphereLight('#cfe2ff', '#7a6040', 0.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0d4', 3.1);
  sun.castShadow = true;
  const sc = sun.shadow.camera;
  sc.near = 1; sc.far = 220;
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
  // Warm haze near sunrise and sunset; a clear blue-grey haze in the middle of the day.
  const fogDay = new THREE.Color('#b9cfe0');
  const fogGold = new THREE.Color('#e3c39b');
  const skyDay = new THREE.Color('#cfe2ff');
  const skyGold = new THREE.Color('#f2d9b8');

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

  const update = (dt, { clock = 10 * 60, focus = null } = {}) => {
    const d = sunDirection(clock);
    u.sunPosition.value.copy(d);
    const elevationDeg = THREE.MathUtils.radToDeg(Math.asin(d.y));
    if (Math.abs(elevationDeg - envElevation) > api.envStep) {
      envElevation = elevationDeg;
      refreshEnv(d);
    }
    sun.intensity = 1.1 + 2.1 * Math.min(1, d.y * 1.6);
    // golden hour: 1 with the sun on the horizon, 0 once it is ~30° up
    const low = 1 - THREE.MathUtils.smoothstep(d.y, 0.12, 0.5);
    // a clear, deep blue by day; hazier and warmer as the sun gets low
    u.turbidity.value = 1.6 + 4.6 * low;
    u.rayleigh.value = 0.7 + 2.6 * low;
    u.mieCoefficient.value = 0.002 + 0.005 * low;
    sun.color.setHSL(0.075 + 0.035 * (1 - low), 0.5 + 0.4 * low, 0.8 + 0.14 * (1 - low));
    scene.fog.color.copy(fogDay).lerp(fogGold, 0.55 * low);
    const cu = clouds.material.uniforms;
    cu.sunDir.value.copy(d);
    cu.sunColor.value.copy(sun.color);
    cu.drift.value = clock * 0.0035; // drifts with the game clock, so the film's frames are repeatable
    cu.light.value = 0.55 + 0.45 * Math.min(1, d.y * 2);
    hemi.color.copy(skyDay).lerp(skyGold, 0.5 * low);
    const f = focus || new THREE.Vector3();
    // Snap the shadow frustum to texels so shadows don't shimmer while walking.
    const step = (sc.right - sc.left) / sun.shadow.mapSize.x;
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

  // envStep: degrees of sun movement between re-bakes of the sky lighting (finer in the film, so it never steps)
  const api = { sun, sky, clouds, hemi, update, setRange, envStep: 4 };
  return api;
}

// Fair-weather cumulus: soft fbm clouds on a plane high above the campus, seen through the sky box. Brighter
// and warmer towards the sun, grey-blue underneath, thinning out towards the horizon.
function cloudLayer() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      sunColor: { value: new THREE.Color('#fff0d4') },
      drift: { value: 0 },
      light: { value: 1 },
    },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position.z = gl_Position.w; // on the far plane, like the sky
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 sunDir, sunColor;
      uniform float drift, light;
      varying vec3 vDir;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int k = 0; k < 5; k++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
        return v;
      }
      void main() {
        vec3 d = normalize(vDir);
        if (d.y < 0.015) discard;
        vec2 p = d.xz / (d.y + 0.12) * 1.6 + vec2(drift, drift * 0.37);
        float n = fbm(p);
        float cover = smoothstep(0.5, 0.78, n);
        float a = cover * smoothstep(0.015, 0.22, d.y) * 0.92;
        if (a < 0.003) discard;
        // thicker cloud is darker underneath; the edges catch the light
        float thick = smoothstep(0.55, 0.95, fbm(p * 1.7 + 3.1));
        float toward = pow(max(dot(d, normalize(sunDir)), 0.0), 6.0);
        vec3 lit = mix(vec3(1.0), sunColor, 0.35) * (1.2 + toward * 0.45);
        vec3 shade = vec3(0.62, 0.68, 0.78);
        vec3 c = mix(lit, shade, thick * 0.75) * light * 2.0;
        gl_FragColor = vec4(c, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return mesh;
}
