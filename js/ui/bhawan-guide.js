// A small guide to the Bhawan you are in or next to: a floor plan of the floor you are on, and a legend of the important
// places with their direction and distance. It shows while you are in or next to the Bhawan; L hides it.
import { FH } from '../world/hostel.js';

const FLOORS = ['Ground floor', 'First floor', 'Roof'];
const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
const FILL = { lobby: '#f2c86b', stair: '#6fb2ff', wash: '#7fd3b0', laundry: '#c5b3f2', common: '#ff9f86', room: '#ffe08a' };
const W = 66; // plan width in CSS pixels

export function createBhawanGuide() {
  const el = document.createElement('div');
  el.id = 'bhawan-guide';
  el.style.cssText = 'position:fixed;left:12px;bottom:36px;z-index:20;display:none;gap:8px;padding:8px 10px;border-radius:10px;background:rgba(12,16,32,0.78);color:#eef2f8;font:12px/1.35 system-ui,sans-serif;pointer-events:none;max-width:290px';
  const plan = document.createElement('canvas');
  const side = document.createElement('div');
  el.append(plan, side);
  document.body.appendChild(el);
  let on = true;
  let timer = 1;

  const draw = (H, floor, lu, lv, heading, items) => {
    const sc = W / H.W; const ht = Math.round(H.L * sc);
    const dpr = window.devicePixelRatio || 1;
    if (plan.width !== W * dpr || plan.height !== ht * dpr) { plan.width = W * dpr; plan.height = ht * dpr; plan.style.width = `${W}px`; plan.style.height = `${ht}px`; }
    const g = plan.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, ht);
    const rect = (r, c) => { g.fillStyle = c; g.fillRect(r.u0 * sc, r.v0 * sc, (r.u1 - r.u0) * sc, (r.v1 - r.v0) * sc); };
    g.fillStyle = floor === 2 ? '#8a8f99' : '#5b6170';
    g.beginPath();
    H.outline.forEach(([u, v], i) => (i ? g.lineTo(u * sc, v * sc) : g.moveTo(u * sc, v * sc)));
    g.fill();
    for (const c of H.court) rect(c, '#b9b4a8');
    if (floor < 2) {
      for (const c of H.corridorRects()) rect(c, '#e9e6de');
      for (const sp of H.spaces) if (sp.k === floor) rect(H.spaceRect(sp), FILL[sp.type] || '#ddd');
    }
    g.font = '9px system-ui';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const it of items) g.fillText(it.icon, it.u * sc, it.v * sc);
    // you
    g.save();
    g.translate(lu * sc, lv * sc);
    g.rotate(heading);
    g.fillStyle = '#ff4d4d';
    g.strokeStyle = '#fff';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, -5); g.lineTo(3.6, 4); g.lineTo(-3.6, 4); g.closePath(); g.fill(); g.stroke();
    g.restore();
  };

  return {
    toggle() { on = !on; timer = 1; return on; },
    hide() { el.style.display = 'none'; },
    update(dt, { hostel: H, player, visible }) {
      timer += dt;
      if (timer < 0.2) return;
      timer = 0;
      const p = player.pos;
      const [lu, lv] = H.local(p.x, p.z);
      const near = lu > -14 && lu < H.W + 14 && lv > -14 && lv < H.L + 14;
      if (!visible || !on || !near) { el.style.display = 'none'; return; }
      el.style.display = 'flex';
      const floor = p.y > FH * 1.6 ? 2 : p.y > FH * 0.6 ? 1 : 0;
      // facing, in the Bhawan's frame (plan up = −v)
      const f = player.forward();
      const fu = f.x * H.eu[0] + f.z * H.eu[1]; const fv = f.x * H.ev[0] + f.z * H.ev[1];
      const heading = Math.atan2(fu, -fv);
      const items = H.legendItems.filter((it) => it.floors.includes(floor));
      draw(H, floor, lu, lv, heading, items);
      const rows = items.map((it) => {
        const du = it.u - lu; const dv = it.v - lv;
        const d = Math.hypot(du, dv);
        let rel = Math.atan2(du, -dv) - heading;
        rel = Math.atan2(Math.sin(rel), Math.cos(rel));
        return { ...it, d, arrow: d < 2 ? '•' : ARROWS[(Math.round(rel / (Math.PI / 4)) + 8) % 8] };
      }).sort((a, b) => a.d - b.d);
      side.innerHTML = '';
      const head = document.createElement('div');
      head.style.cssText = 'font-weight:700;margin-bottom:3px';
      head.textContent = `${H.name} · ${FLOORS[floor]}`;
      side.appendChild(head);
      for (const r of rows.slice(0, 9)) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:6px;white-space:nowrap';
        row.textContent = `${r.icon} ${r.name}`;
        const tail = document.createElement('span');
        tail.style.cssText = 'margin-left:auto;padding-left:8px;opacity:0.8;font-variant-numeric:tabular-nums';
        tail.textContent = `${r.arrow} ${Math.round(r.d)} m`;
        row.appendChild(tail);
        side.appendChild(row);
      }
      const foot = document.createElement('div');
      foot.style.cssText = 'margin-top:4px;opacity:0.6;font-size:11px';
      foot.textContent = document.body.classList.contains('touch') ? '☰ menu hides this guide' : 'L hides this guide';
      side.appendChild(foot);
    },
  };
}
