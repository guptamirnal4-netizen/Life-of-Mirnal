// Minimap (top-right) and full labelled map (N) for the real-scale BITS campus, drawn from the campus data.
import { BITS_CAMPUS as D } from '../../data/bits-campus.js';
import { WALK_IN } from '../world/hostel.js';

const MPP = 1.25; // metres per base-image pixel

function bounds() {
  let minX = Infinity; let maxX = -Infinity; let minZ = Infinity; let maxZ = -Infinity;
  for (const [x, z] of D.boundary) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  return { minX: minX - 80, maxX: maxX + 80, minZ: minZ - 80, maxZ: maxZ + 80 };
}

function drawBase() {
  const B = bounds();
  const W = Math.ceil((B.maxX - B.minX) / MPP);
  const H = Math.ceil((B.maxZ - B.minZ) / MPP);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const P = ([x, z]) => [(x - B.minX) / MPP, (z - B.minZ) / MPP];
  const poly = (pts, fill, stroke) => {
    g.beginPath();
    pts.forEach((p, i) => { const [a, b] = P(p); if (i) g.lineTo(a, b); else g.moveTo(a, b); });
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.stroke(); }
  };
  g.fillStyle = '#e9dcc0'; g.fillRect(0, 0, W, H);
  poly(D.boundary, '#efe4ca', null);
  const col = { grass: '#a9d18e', wood: '#b7c79a', pitch: '#8cc878', ground: '#9fd08a', track: '#dcc396', pool: '#5aa0e0', water: '#5aa0e0', shivganga: '#4e8f6b' };
  for (const a of D.areas) poly(a.poly, col[a.kind] || '#a9d18e');
  g.lineCap = 'round';
  for (const r of D.roads) {
    const foot = ['footway', 'path', 'steps'].includes(r.kind);
    g.strokeStyle = foot ? '#d6c8a8' : '#9a948a';
    g.lineWidth = Math.max(1, r.w / MPP);
    g.beginPath();
    r.pts.forEach((p, i) => { const [a, b] = P(p); if (i) g.lineTo(a, b); else g.moveTo(a, b); });
    g.stroke();
  }
  g.lineWidth = 0.6;
  for (const b of D.buildings) {
    poly(b.outer, b.inCampus ? '#c9a77a' : '#d8cfc0', '#7a5a3a');
    for (const h of b.holes) poly(h, WALK_IN.includes(b.name) ? '#d6d1c6' : '#b5d99f', null); // walk-in Bhawans' courtyards are concrete playgrounds
  }
  g.lineWidth = 2;
  poly(D.boundary, null, 'rgba(180,30,30,0.6)');
  return { canvas: c, B };
}

export function createMinimap() {
  let base = null;
  const small = document.createElement('canvas');
  small.id = 'minimap';
  small.width = 200; small.height = 200;
  const big = document.createElement('div');
  big.id = 'bigmap';
  const bigCanvas = document.createElement('canvas');
  big.append(bigCanvas);
  const hud = document.getElementById('hud');
  hud.append(small);
  document.body.append(big);
  let shown = false;
  let bigOpen = false;
  let bigBase = null; // the big map with its labels, drawn when it opens
  let bigScale = 1;

  const ensure = () => { if (!base) base = drawBase(); };
  const toPx = (x, z) => [(x - base.B.minX) / MPP, (z - base.B.minZ) / MPP];

  const arrow = (g, x, y, yaw, size, color) => {
    g.save();
    g.translate(x, y);
    g.rotate(-yaw);
    g.fillStyle = color; g.strokeStyle = '#ffffff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -size); g.lineTo(size * 0.7, size * 0.8); g.lineTo(0, size * 0.35); g.lineTo(-size * 0.7, size * 0.8); g.closePath();
    g.fill(); g.stroke();
    g.restore();
  };

  return {
    setVisible(v) {
      shown = v;
      small.style.display = v ? 'block' : 'none';
      if (!v) this.closeBig();
    },
    get bigOpen() { return bigOpen; },
    // Opens the full campus map. It is drawn once (map and labels) and the live layer on top (drawBig) every frame.
    toggleBig() {
      if (bigOpen) return this.closeBig();
      ensure();
      bigOpen = true;
      big.classList.add('open');
      const H = Math.min(window.innerHeight - 40, 1400);
      bigScale = H / base.canvas.height;
      bigCanvas.width = Math.round(base.canvas.width * bigScale);
      bigCanvas.height = Math.round(base.canvas.height * bigScale);
      bigBase = document.createElement('canvas');
      bigBase.width = bigCanvas.width; bigBase.height = bigCanvas.height;
      const g = bigBase.getContext('2d');
      const scale = bigScale;
      g.drawImage(base.canvas, 0, 0, bigCanvas.width, bigCanvas.height);
      // Labels: landmarks first, then anything else that has room. Overlapping labels are dropped.
      const KEY = /Rotunda|Clock Tower|Saraswati|Shiv Ganga|New Academic|BITS Library|Gymkhana|Student Activ|C'not|All night|Bhawan|Main Building \(|FD|Med-C|VFAST|Lawns|South Park|Workshop/;
      const cands = [];
      const seen = new Set();
      const add = (name, x, z, dot) => { if (!name || seen.has(name)) return; seen.add(name); cands.push({ name, x, z, dot, key: KEY.test(name) }); };
      for (const p of D.pois) add(p.name, p.x, p.z, true);
      for (const b of D.buildings) {
        if (!b.name || !b.inCampus) continue;
        add(b.name, b.outer.reduce((a, q) => a + q[0], 0) / b.outer.length, b.outer.reduce((a, q) => a + q[1], 0) / b.outer.length, false);
      }
      cands.sort((a, b) => b.key - a.key);
      const boxes = [[0, 0, 470, 76]]; // keep the header clear
      g.textBaseline = 'middle';
      for (const c of cands) {
        const [px, py] = toPx(c.x, c.z);
        const x = px * scale; const y = py * scale;
        g.font = c.key ? '700 11px system-ui, sans-serif' : '500 10px system-ui, sans-serif';
        const w = g.measureText(c.name).width;
        const box = [x + 4, y - 7, x + 6 + w, y + 7];
        if (boxes.some((o) => box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1])) continue;
        boxes.push(box);
        g.fillStyle = c.key ? '#a01818' : '#6b4a2a';
        g.beginPath(); g.arc(x, y, c.key ? 3 : 2, 0, Math.PI * 2); g.fill();
        g.lineWidth = 3; g.strokeStyle = 'rgba(255,250,240,0.85)'; g.strokeText(c.name, x + 5, y);
        g.fillStyle = c.key ? '#1d1a24' : '#4a3b2a'; g.fillText(c.name, x + 5, y);
      }
      return true;
    },
    // The live layer, like a phone map: your blue dot with its heading, the route to your objective along the
    // roads, and how far and how long it is. info: { target, route, place, timeScale }.
    drawBig(player, { target = null, route = null, place = '', timeScale = 1 } = {}) {
      if (!bigOpen || !bigBase) return;
      const g = bigCanvas.getContext('2d');
      const sc = bigScale;
      const P = (v) => { const [x, y] = toPx(v.x, v.z); return [x * sc, y * sc]; };
      g.drawImage(bigBase, 0, 0);
      const [x, y] = P(player.pos);
      let dist = 0;
      if (target && route?.length) {
        const pts = [[x, y], ...route.map(P)];
        for (let i = 1; i < route.length; i++) dist += Math.hypot(route[i].x - route[i - 1].x, route[i].z - route[i - 1].z);
        dist += Math.hypot(route[0].x - player.pos.x, route[0].z - player.pos.z);
        g.lineJoin = 'round'; g.lineCap = 'round';
        for (const [w, c] of [[8, '#ffffff'], [5, '#1a73e8']]) {
          g.lineWidth = w; g.strokeStyle = c;
          g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke();
        }
      }
      if (target) {
        const [tx, ty] = P(target);
        g.fillStyle = '#ea4335'; g.strokeStyle = '#ffffff'; g.lineWidth = 2;
        g.beginPath(); g.arc(tx, ty - 14, 8, Math.PI, 0); g.lineTo(tx, ty); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(tx, ty - 14, 3, 0, Math.PI * 2); g.fill();
      }
      // heading cone, pulsing accuracy halo, blue dot
      const t = performance.now() / 1000;
      const fx = -Math.sin(player.yaw); const fz = -Math.cos(player.yaw);
      const head = Math.atan2(fz, fx);
      const cone = g.createRadialGradient(x, y, 4, x, y, 34);
      cone.addColorStop(0, 'rgba(26,115,232,0.55)'); cone.addColorStop(1, 'rgba(26,115,232,0)');
      g.fillStyle = cone; g.beginPath(); g.moveTo(x, y); g.arc(x, y, 34, head - 0.5, head + 0.5); g.closePath(); g.fill();
      g.fillStyle = `rgba(26,115,232,${0.18 * (1 - ((t * 0.8) % 1))})`;
      g.beginPath(); g.arc(x, y, 8 + 16 * ((t * 0.8) % 1), 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, 8.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1a73e8'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
      // header: what this is, and where you're going
      const mins = (speed) => Math.max(1, Math.round((dist / speed) * timeScale));
      const lines = ['BITS Pilani · live · north is up · N closes'];
      if (target) lines.push(`→ ${place} · ${dist < 1000 ? `${Math.round(dist / 10) * 10} m` : `${(dist / 1000).toFixed(1)} km`} · 🏃 ${mins(4.5)} min · 🚲 ${mins(7)} min`);
      g.font = '600 14px system-ui'; g.textBaseline = 'middle';
      const w = Math.max(...lines.map((l) => g.measureText(l).width)) + 20;
      g.fillStyle = 'rgba(20,24,40,0.88)'; g.fillRect(10, 10, w, 12 + lines.length * 22);
      lines.forEach((l, i) => { g.fillStyle = i ? '#bcd6ff' : '#ffffff'; g.fillText(l, 20, 27 + i * 22); });
    },
    closeBig() {
      bigOpen = false;
      big.classList.remove('open');
    },
    update(player, target, route = null) {
      if (!shown) return;
      ensure();
      const g = small.getContext('2d');
      const view = 320; // metres across
      const [px, py] = toPx(player.pos.x, player.pos.z);
      const sw = view / MPP;
      g.clearRect(0, 0, 200, 200);
      g.save();
      g.beginPath(); g.arc(100, 100, 98, 0, Math.PI * 2); g.clip();
      g.fillStyle = '#e9dcc0'; g.fillRect(0, 0, 200, 200);
      g.drawImage(base.canvas, px - sw / 2, py - sw / 2, sw, sw, 0, 0, 200, 200);
      if (route?.length) {
        const k = 200 / sw; const at = (v) => { const [rx, ry] = toPx(v.x, v.z); return [100 + (rx - px) * k, 100 + (ry - py) * k]; };
        g.lineJoin = 'round'; g.lineCap = 'round';
        for (const [w, c] of [[6, '#ffffff'], [3.5, '#1a73e8']]) { g.lineWidth = w; g.strokeStyle = c; g.beginPath(); g.moveTo(100, 100); for (const v of route) g.lineTo(...at(v)); g.stroke(); }
      }
      if (target) {
        const [tx, ty] = toPx(target.x, target.z);
        let dx = ((tx - px) / sw) * 200; let dy = ((ty - py) / sw) * 200;
        const d = Math.hypot(dx, dy);
        if (d > 88) { dx *= 88 / d; dy *= 88 / d; }
        g.fillStyle = '#ff7a00'; g.strokeStyle = '#fff'; g.lineWidth = 2;
        g.beginPath(); g.arc(100 + dx, 100 + dy, 6, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      arrow(g, 100, 100, player.yaw, 9, '#1f6feb');
      g.restore();
      g.strokeStyle = 'rgba(20,24,40,0.85)'; g.lineWidth = 3;
      g.beginPath(); g.arc(100, 100, 98, 0, Math.PI * 2); g.stroke();
      g.fillStyle = 'rgba(20,24,40,0.85)'; g.font = '700 12px system-ui'; g.fillText('N', 95, 14);
    },
  };
}
