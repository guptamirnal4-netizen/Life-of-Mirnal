// Minimap (top-right) and full labelled map (N) for the real-scale BITS campus, drawn from the campus data.
import { BITS_CAMPUS as D } from '../../data/bits-campus.js';

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
    for (const h of b.holes) poly(h, b.name === 'Krishna Bhawan' ? '#d6d1c6' : '#b5d99f', null); // Krishna's courtyards are concrete playgrounds
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
    toggleBig(player, target) {
      if (bigOpen) return this.closeBig();
      ensure();
      bigOpen = true;
      big.classList.add('open');
      const H = Math.min(window.innerHeight - 40, 1400);
      const scale = H / base.canvas.height;
      bigCanvas.width = Math.round(base.canvas.width * scale);
      bigCanvas.height = Math.round(base.canvas.height * scale);
      const g = bigCanvas.getContext('2d');
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
      const boxes = [];
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
      if (target) {
        const [tx, ty] = toPx(target.x, target.z);
        g.fillStyle = '#ff7a00'; g.beginPath(); g.arc(tx * scale, ty * scale, 7, 0, Math.PI * 2); g.fill();
      }
      const [x, y] = toPx(player.pos.x, player.pos.z);
      arrow(g, x * scale, y * scale, player.yaw, 11, '#1f6feb');
      g.fillStyle = 'rgba(20,24,40,0.85)'; g.fillRect(10, 10, 300, 28);
      g.fillStyle = '#ffffff'; g.font = '600 14px system-ui'; g.fillText('BITS Pilani · press N to close · north is up', 18, 24);
    },
    closeBig() {
      bigOpen = false;
      big.classList.remove('open');
    },
    update(player, target) {
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
