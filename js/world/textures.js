import * as THREE from 'three';

// Procedural canvas textures: no image assets, no licences. Each texture covers `size` metres of world space.
let seed = 1;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const shade = (hex, f) => {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, f);
  return `#${c.getHexString()}`;
};

function noise(ctx, S, base, amount, n = 9000, size = 2) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = shade(base, (rnd() - 0.5) * amount);
    ctx.globalAlpha = 0.35 + rnd() * 0.4;
    ctx.fillRect(rnd() * S, rnd() * S, size * (0.5 + rnd()), size * (0.5 + rnd()));
  }
  ctx.globalAlpha = 1;
}

const PAINTERS = {
  brick(ctx, S) {
    ctx.fillStyle = '#cbbfae';
    ctx.fillRect(0, 0, S, S);
    const rows = 8;
    const bh = S / rows;
    const bw = S / 4;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? bw / 2 : 0;
      for (let c = -1; c < 5; c++) {
        const base = ['#a8492f', '#b4533a', '#9b4129', '#bd5c40', '#a04a33'][Math.floor(rnd() * 5)];
        ctx.fillStyle = base;
        ctx.fillRect(c * bw + off + 3, r * bh + 3, bw - 6, bh - 6);
        for (let k = 0; k < 40; k++) {
          ctx.fillStyle = shade(base, (rnd() - 0.5) * 0.12);
          ctx.fillRect(c * bw + off + 3 + rnd() * (bw - 8), r * bh + 3 + rnd() * (bh - 8), 3, 3);
        }
      }
    }
  },
  plaster(ctx, S) { noise(ctx, S, '#efe3c8', 0.06, 12000, 3); },
  plasterWhite(ctx, S) { noise(ctx, S, '#f2efe8', 0.05, 12000, 3); },
  plasterBlue(ctx, S) { noise(ctx, S, '#dfe9ee', 0.05, 12000, 3); },
  dado(ctx, S) { noise(ctx, S, '#8f3b2a', 0.08, 8000, 3); },
  dadoGreen(ctx, S) { noise(ctx, S, '#5d8a6a', 0.07, 8000, 3); },
  tiles(ctx, S) {
    const n = 4;
    const t = S / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const base = (i + j) % 2 ? '#d9d2c3' : '#b9ae98';
        ctx.fillStyle = base;
        ctx.fillRect(i * t, j * t, t, t);
        for (let k = 0; k < 140; k++) {
          ctx.fillStyle = shade(base, (rnd() - 0.5) * 0.1);
          ctx.fillRect(i * t + rnd() * t, j * t + rnd() * t, 2, 2);
        }
      }
    }
    ctx.strokeStyle = '#8a8070';
    ctx.lineWidth = 3;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath(); ctx.moveTo(i * t, 0); ctx.lineTo(i * t, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * t); ctx.lineTo(S, i * t); ctx.stroke();
    }
  },
  terrazzo(ctx, S) {
    noise(ctx, S, '#cfc6b6', 0.04, 4000, 2);
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = ['#7d7468', '#a39687', '#e8e2d6', '#5c5650', '#b48a6a'][Math.floor(rnd() * 5)];
      const r = 1 + rnd() * 3;
      ctx.beginPath(); ctx.arc(rnd() * S, rnd() * S, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  paving(ctx, S) {
    ctx.fillStyle = '#8c8578';
    ctx.fillRect(0, 0, S, S);
    const n = 4;
    const t = S / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const base = ['#c3baa8', '#b8ae9b', '#cdc4b2', '#b0a690'][Math.floor(rnd() * 4)];
        ctx.fillStyle = base;
        ctx.fillRect(i * t + 3, j * t + 3, t - 6, t - 6);
        for (let k = 0; k < 160; k++) {
          ctx.fillStyle = shade(base, (rnd() - 0.5) * 0.12);
          ctx.fillRect(i * t + 3 + rnd() * (t - 8), j * t + 3 + rnd() * (t - 8), 2, 2);
        }
      }
    }
  },
  grass(ctx, S) {
    noise(ctx, S, '#5a8f3e', 0.1, 6000, 3);
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 9000; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      ctx.strokeStyle = shade(['#4f8a35', '#6aa24a', '#3f7a2c', '#7bb05a'][Math.floor(rnd() * 4)], (rnd() - 0.5) * 0.08);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 4, y - 4 - rnd() * 6); ctx.stroke();
    }
  },
  dirt(ctx, S) {
    noise(ctx, S, '#a88d63', 0.1, 14000, 4);
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = ['#8a7350', '#c2a97e', '#76603f'][Math.floor(rnd() * 3)];
      ctx.beginPath(); ctx.arc(rnd() * S, rnd() * S, 1 + rnd() * 2.5, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = 'rgba(90,130,60,0.45)';
      ctx.fillRect(rnd() * S, rnd() * S, 3, 6);
    }
  },
  wood(ctx, S) {
    const planks = 6;
    const ph = S / planks;
    for (let p = 0; p < planks; p++) {
      const base = ['#8a5a34', '#7a4e2c', '#94643c', '#6f4527'][p % 4];
      ctx.fillStyle = base;
      ctx.fillRect(0, p * ph, S, ph);
      for (let k = 0; k < 30; k++) {
        ctx.strokeStyle = shade(base, (rnd() - 0.5) * 0.12);
        ctx.lineWidth = 1 + rnd() * 2;
        const y = p * ph + rnd() * ph;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(S / 3, y + (rnd() - 0.5) * 6, (2 * S) / 3, y + (rnd() - 0.5) * 6, S, y); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, p * ph, S, 2);
    }
  },
  rooftile(ctx, S) {
    const rows = 8;
    const rh = S / rows;
    ctx.fillStyle = '#7a2e1c';
    ctx.fillRect(0, 0, S, S);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 10; c++) {
        const x = c * (S / 10) + (r % 2 ? S / 20 : 0);
        const g = ctx.createLinearGradient(x, 0, x + S / 10, 0);
        g.addColorStop(0, '#9c3f25');
        g.addColorStop(0.5, '#c8613d');
        g.addColorStop(1, '#8a3520');
        ctx.fillStyle = g;
        ctx.fillRect(x + 1, r * rh + 1, S / 10 - 2, rh - 2);
      }
    }
  },
  concrete(ctx, S) { noise(ctx, S, '#b9b4ab', 0.08, 14000, 3); },
  track(ctx, S) { noise(ctx, S, '#b5653f', 0.08, 12000, 3); },
  board(ctx, S) { noise(ctx, S, '#e9dfc4', 0.05, 6000, 2); },
};

const cache = new Map();
export function texture(name, maxAniso = 8) {
  if (cache.has(name)) return cache.get(name);
  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  seed = [...name].reduce((a, ch) => a + ch.charCodeAt(0) * 97, 7);
  PAINTERS[name](ctx, S);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  cache.set(name, tex);
  return tex;
}

// World size (metres) one texture repeat covers.
export const TEX_SIZE = {
  brick: 1.6, plaster: 3, plasterWhite: 3, plasterBlue: 3, dado: 2, dadoGreen: 2, tiles: 2, terrazzo: 2.5,
  paving: 3, grass: 4, dirt: 6, wood: 1.5, rooftile: 2.5, concrete: 3, track: 4, board: 2,
};

const texMats = new Map();
export function texturedMaterial(name, { roughness = 0.9, metalness = 0, tint = '#ffffff' } = {}) {
  const key = `${name}|${roughness}|${tint}`;
  if (!texMats.has(key)) texMats.set(key, new THREE.MeshStandardMaterial({ map: texture(name), roughness, metalness, color: tint }));
  return texMats.get(key);
}

// A box whose UVs are in world metres, so textures tile instead of stretching.
export function worldBoxGeometry(w, h, d, tile) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let face = 0; face < 6; face++) {
    const [du, dv] = dims[face];
    for (let k = 0; k < 4; k++) {
      const i = face * 4 + k;
      uv.setXY(i, (uv.getX(i) * du) / tile, (uv.getY(i) * dv) / tile);
    }
  }
  uv.needsUpdate = true;
  return g;
}

export function worldPlane(w, d, tile) {
  const g = new THREE.PlaneGeometry(w, d);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * d) / tile);
  uv.needsUpdate = true;
  return g;
}
