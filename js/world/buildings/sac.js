// Student Activities Centre (SAC): the single-storey hall and pavilion complex west of Budh Bhawan.
// Research: research/buildings/sac.md (and research/review.md: Looters, TOTT and -301°F belong here).
//
// Frame: the identity (u = x east, v = z south, world metres): the halls and corridors line up with the campus axes to
// within about 2° (research A), so every collider is one world box.
//
// The complex, about x -205..-125, z 226..357 (research: about 85 × 127 m; the OSM box covers only the two halls):
//   west block      x -200..-170.5, z 290..325   sports halls: badminton (3 courts) with the Martial Arts mezzanine and
//                                                 its stair, table tennis and a squash court; steel trusses, gable roof
//   east hall       x -170.5..-140.5, z 291..317 "SAC inside": open arcades north and south onto the lawns, curved roof
//                                                 with solar panels; the gameplay room 'auditorium' (placed by bits-world)
//                                                 is its central enclosure: lined outside, re-dressed inside (Kota floor,
//                                                 the curtain mural over its stage, tube lights)
//   lobby, portico  x -140.5..-127, round the room door's line (z 304.6): battered grey-blue frame, salmon chevron
//                                                 frieze, terracotta medallion, oval-coffered soffit, the sign, steps and a
//                                                 central ramp onto the pink stamped forecourt and the road
//   east wings      x -140.5..-129 either side of the lobby: hipped single-storey blocks (closed; use unknown)
//   covered corridors with brick jali: north (z 279..282.5), south (z 326.5..330), two links to the hall corners, and a
//                   north-south corridor through each pavilion cluster
//   club pavilions  NW 2 × 3 (Gym, Gym 2, Snooker open) and SW 2 × 3 (Dance Club, Classical Music & Dance, Music Room
//                   Gurukul open); barrel-vaulted inside, terracotta hipped roofs
//   kiosks          TOTT and -301°F on the raised TOTT terrace (NE), the SE cluster with Jawed Habib Salon
//   Looters         the OSM stall (black shed, neon sign, tent canopy), its food court and the dark dining shed
//   lawns           north (z 282.5..290) and south (z 318..326.5); the two OSM grass polygons that ran under the halls
//                   are replaced by them
//
// Levels: the halls, lobby and portico stand on a plinth at P (0.45; research: 0.5-0.6), up 3 steps from the
// lawns and forecourt; the gameplay room stays at bare ground (its floor is the game's), so its door opens three
// steps down from the hall's east vestibule. The Martial Arts mezzanine is at M = P + 4.0. Pavilions at PV, corridors
// at CF. Layers: 'shell' (everything seen from outside), interior zones 'hall', 'sports', 'clubsN', 'clubsS', 'kiosksN', 'kiosksS', 'looters'.
import * as THREE from 'three';
import { worldBoxGeometry, TEX_SIZE } from '../textures.js';

const P = 0.45; // hall plinth
const PV = 0.3; // pavilion floors
const CF = 0.15; // covered corridors
const M = P + 4.0; // Martial Arts mezzanine
const WB = { x0: -200, x1: -170.5, z0: 290, z1: 325, eave: 9, ridge: 10.6, part: 309 };
const EH = { x0: -170.5, x1: -140.5, z0: 291, z1: 317, spring: 6.0, crown: 8.0, arch: 4.0, rise: 0.6, ceil: 5.2 };
const LIN = 0.4; // lining round the gameplay room

// world size of one repeat of the module's canvas textures
const XT = { kota: 3, stamped: 3, jali: 0.8, marble: 2, sheet: 1.2, mats: 2, grille: 0.5, net: 0.3 };

const K = {
  blue: 'c:#9eabb4', bluePl: 't:plaster:#a7b4bd', white: 'c:#f2f2ee', salmon: 'c:#d8a597', terra: 'c:#b5653f',
  cream: 't:plaster:#efe6d2', creamC: 'c:#ece3cf', plinth: 'c:#8e9396', granite: 'c:#7f8689', granDark: 'c:#5f6669',
  roofTile: 't:rooftile:#d9927a', kioskRoof: 'c:#cdc4b3', sheet: 'x:sheet', pv: 'm:#24324f', pvFrame: 'c:#c9cdd1',
  kota: 'x:kota', marble: 'x:marble', stamped: 'x:stamped', step: 'c:#a3a7a8', terrazzo: 't:terrazzo:#cfcabd',
  corridor: 't:terrazzo:#bdb7ad', brick: 't:brick:#b45a3c', jali: 'x:jali', glass: 'c:#29333c', grille: 'x:grille',
  glazed: 'g:#bcd6e2', wood: 't:wood:#7a5232', woodLt: 't:wood:#b08a5a', frame: 'c:#4a3a2a', ceiling: 'c:#f3f0ea',
  sheetUnder: 'c:#a3abb0', purlin: 'm:#6f777d', teal: 't:plaster:#5fa9a4', dado: 'c:#7d8689', truss: 'c:#8a3b2a',
  court: 'c:#2f7d57', courtLine: 'x:court', ttBlue: 'c:#2c5d8f', ttGreen: 'c:#2f6b4f', ttTop: 'c:#1f4fa0',
  red: 'c:#b22a2a', netW: 'c:#f2f2f2', maple: 't:wood:#d9b27a', squashW: 'c:#f4f4f0', mats: 'x:mats', steel: 'm:#7d858c',
  black: 'c:#1d2023', paving: 't:paving:#d6cfc1', grass: 't:grass', hedge: 'c:#3f6f2f', sand: 'c:#b4553c',
  lamp: 'e:#fff1c9', chairRed: 'c:#c8262b', chairWhite: 'c:#f1f1ee', table: 'c:#e9e6df', darkRoof: 'c:#3b3f44',
  orange: 'c:#e08a2e', lavender: 't:plaster:#b7b3e0', lavDark: 'c:#4b3f78', orangeWall: 't:plaster:#e9a35a',
  mirror: 'm:#d8e4ea', signs: 'x:signs', mural: 'x:mural', honour: 'x:honour', chevron: 'x:chevron', medal: 'x:medallion',
  coffer: 'x:coffer', neon: 'neon', canopy: 'c:#f4f2ec', rubber: 'c:#2a2c2e', cushion: 'c:#c0392b', pole: 'c:#eef0f0',
};

function canvas(w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
let seed = 11;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const jitter = (hex, f) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, (rnd() - 0.5) * f); return `#${c.getHexString()}`; };
const alpha = (t) => { t.userData = { alphaTest: 0.5, doubleSide: true }; return t; };

// Sign atlas rows: [id, line 1, line 2, background, ink]
const SIGNS = [
  ['sac', 'BITS', 'STUDENTS ACTIVITIES CENTRE', '#f7f7f2', '#1f2a44'],
  ['tott', 'TOTT', '', '#2b2b2b', '#f4d35e'],
  ['f301', '-301°F', 'ice cream · shakes', '#1d4e89', '#ffffff'],
  ['jh', 'JAWED HABIB', 'HAIR & BEAUTY SALON', '#141414', '#f2f2f2'],
  ['gym', 'HEALTH CLUB · GYM', '', '#f2efe6', '#7a2e12'],
  ['gym2', 'GYM 2 · CARDIO', '', '#f2efe6', '#7a2e12'],
  ['snooker', 'SNOOKER', '', '#f2efe6', '#1f4d2e'],
  ['dance', 'DANCE CLUB', '', '#f2efe6', '#3d2f7a'],
  ['classical', 'CLASSICAL MUSIC & DANCE', '', '#f2efe6', '#3d2f7a'],
  ['gurukul', 'MUSIC ROOM · GURUKUL', '', '#f2efe6', '#3d2f7a'],
  ['badminton', 'BADMINTON HALL', '', '#f2efe6', '#1f4f6a'],
  ['tthall', 'TABLE TENNIS · SQUASH', '', '#f2efe6', '#1f4f6a'],
  ['martial', 'MARTIAL ARTS', '', '#2a3550', '#f2c230'],
  ['dhwani', 'DHWANI', 'music club', '#151515', '#e8452c'],
  ['club', 'CLUB ROOM', '', '#f2efe6', '#555555'],
  ['shop1', 'STATIONERY · XEROX', '', '#f2f2ee', '#1f2a44'],
  ['shop2', 'JUICE CORNER', '', '#2e7d32', '#ffffff'],
  ['shop3', 'GENERAL STORE', '', '#f2f2ee', '#7a2622'],
  ['notices', 'NOTICES', '', '#5a3a22', '#f6ecd2'],
  ['looters', 'LOOTERS', 'food · shakes · late nights', '#101010', '#ff4f9a'],
];
const SROW = Object.fromEntries(SIGNS.map((s, i) => [s[0], i]));

const TEXTURES = {
  kota: () => canvas(512, 512, (g, W) => { // grey Kota slabs (0.6 m) with a white and green marble inlay grid every 3 m
    const n = 5; const s = W / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const base = jitter('#8f968f', 0.07); g.fillStyle = base; g.fillRect(i * s, j * s, s, s);
      for (let k = 0; k < 90; k++) { g.fillStyle = jitter(base, 0.08); g.globalAlpha = 0.35; g.fillRect(i * s + rnd() * s, j * s + rnd() * s, 5, 3); }
      g.globalAlpha = 1; g.strokeStyle = '#6c726b'; g.lineWidth = 1.5; g.strokeRect(i * s + 0.5, j * s + 0.5, s - 1, s - 1);
    }
    g.fillStyle = '#f1efe9'; g.fillRect(0, 0, W, 7); g.fillRect(0, 0, 7, W);
    g.fillStyle = '#2f5a49'; g.fillRect(0, 9, W, 4); g.fillRect(9, 0, 4, W);
  }),
  stamped: () => canvas(512, 512, (g, W) => { // salmon-pink stamped concrete, irregular flagstones
    const n = 5; const s = W / n; const J = [];
    for (let i = 0; i <= n; i++) { J[i] = []; for (let j = 0; j <= n; j++) J[i][j] = i % n === 0 || j % n === 0 ? [0, 0] : [(rnd() - 0.5) * s * 0.5, (rnd() - 0.5) * s * 0.5]; }
    for (let j = 0; j <= n; j++) J[n][j] = J[0][j];
    for (let i = 0; i <= n; i++) J[i][n] = J[i][0];
    const pt = (i, j) => [i * s + J[i][j][0], j * s + J[i][j][1]];
    g.fillStyle = '#8e5f55'; g.fillRect(0, 0, W, W);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = jitter('#cc9a8a', 0.08); g.beginPath();
      const q = [pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1)];
      const c = [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2];
      q.forEach(([x, y], k) => { const xx = x + (c[0] - x) * 0.05; const yy = y + (c[1] - y) * 0.05; if (k) g.lineTo(xx, yy); else g.moveTo(xx, yy); });
      g.fill();
      for (let k = 0; k < 40; k++) { g.fillStyle = 'rgba(120,70,60,0.18)'; g.fillRect(c[0] + (rnd() - 0.5) * s * 0.7, c[1] + (rnd() - 0.5) * s * 0.7, 3, 3); }
    }
  }),
  jali: () => alpha(canvas(256, 256, (g, W) => { // red-brick jali: brick lattice with square openings
    g.fillStyle = '#a4492f'; g.fillRect(0, 0, W, W);
    for (let y = 0; y < W; y += 16) { g.fillStyle = 'rgba(230,200,180,0.5)'; g.fillRect(0, y, W, 2); }
    const n = 4; const s = W / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) g.clearRect(i * s + s * 0.22, j * s + s * 0.22, s * 0.56, s * 0.56);
  })),
  marble: () => canvas(256, 256, (g, W) => { // grey marble landing with white inlay lines every metre
    g.fillStyle = '#8d9295'; g.fillRect(0, 0, W, W);
    for (let k = 0; k < 600; k++) { g.fillStyle = jitter('#8d9295', 0.12); g.fillRect(rnd() * W, rnd() * W, 4, 2); }
    g.fillStyle = '#f1f1ec'; for (const p of [0, W / 2]) { g.fillRect(p, 0, 4, W); g.fillRect(0, p, W, 4); }
  }),
  sheet: () => canvas(64, 128, (g, W, H) => { // corrugated blue-grey metal sheet (ribs run down the slope)
    for (let y = 0; y < H; y += 16) { g.fillStyle = '#8796a3'; g.fillRect(0, y, W, 9); g.fillStyle = '#6f7d89'; g.fillRect(0, y + 9, W, 7); }
  }),
  mats: () => canvas(256, 256, (g, W) => { // interlocking foam mats, 1 m, blue and yellow
    const s = W / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#f2c230' : '#1f5fbf'; g.fillRect(i * s, j * s, s, s); }
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, W); g.moveTo(0, i * s); g.lineTo(W, i * s); g.stroke(); }
  }),
  grille: () => alpha(canvas(128, 128, (g, W) => { // window grille: square steel bars
    g.clearRect(0, 0, W, W); g.fillStyle = '#2d3236';
    for (let x = 0; x < W; x += 32) g.fillRect(x, 0, 5, W);
    g.fillRect(0, 0, W, 5); g.fillRect(0, W / 2, W, 4);
  })),
  net: () => alpha(canvas(64, 64, (g, W) => { g.clearRect(0, 0, W, W); g.strokeStyle = '#1b1d1f'; g.lineWidth = 3; g.strokeRect(0, 0, W, W); })),
  court: () => { // one badminton court, 6.1 × 13.4 m, white lines on green (transparent elsewhere)
    const t = canvas(256, 512, (g, W, H) => {
      g.clearRect(0, 0, W, H);
      const sx = W / 6.1; const sy = H / 13.4; const L = (x0, y0, x1, y1) => { g.fillRect(x0 * sx - 2, y0 * sy - 2, (x1 - x0) * sx + 4, (y1 - y0) * sy + 4); };
      g.fillStyle = '#f4f4f0';
      L(0, 0, 6.1, 0); L(0, 13.4, 6.1, 13.4); L(0, 0, 0, 13.4); L(6.1, 0, 6.1, 13.4); // doubles
      L(0.46, 0, 0.46, 13.4); L(5.64, 0, 5.64, 13.4); // singles
      L(0, 0.76, 6.1, 0.76); L(0, 12.64, 6.1, 12.64); // long service (doubles)
      L(0, 6.7 - 1.98, 6.1, 6.7 - 1.98); L(0, 6.7 + 1.98, 6.1, 6.7 + 1.98); // short service
      L(3.05, 0, 3.05, 6.7 - 1.98); L(3.05, 6.7 + 1.98, 3.05, 13.4); // centre
    });
    return alpha(t);
  },
  mural: () => canvas(1280, 256, (g, W, H) => { // a theatre curtain drawn back by two giant hands; stars; geometric faces
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#16204a'); gr.addColorStop(1, '#3b2858'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 160; i++) { g.fillStyle = rnd() < 0.7 ? '#fff6c8' : '#9fd3ff'; const r = 0.8 + rnd() * 2.2; g.beginPath(); g.arc(rnd() * W, rnd() * H * 0.85, r, 0, 7); g.fill(); }
    const glow = g.createRadialGradient(W / 2, H * 0.7, 10, W / 2, H * 0.7, 260); glow.addColorStop(0, 'rgba(255,214,120,0.55)'); glow.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
    // geometric faces in the middle
    const face = (cx, cy, s, c1, c2) => {
      g.fillStyle = c1; g.beginPath(); g.moveTo(cx, cy - s); g.lineTo(cx + s * 0.8, cy + s * 0.6); g.lineTo(cx - s * 0.8, cy + s * 0.6); g.closePath(); g.fill();
      g.fillStyle = c2; g.beginPath(); g.arc(cx - s * 0.25, cy, s * 0.14, 0, 7); g.arc(cx + s * 0.25, cy, s * 0.14, 0, 7); g.fill();
      g.fillRect(cx - s * 0.3, cy + s * 0.3, s * 0.6, s * 0.08);
    };
    face(W / 2 - 150, H * 0.55, 60, '#e9b44c', '#1b1b2f'); face(W / 2, H * 0.48, 74, '#4fb0c6', '#1b1b2f'); face(W / 2 + 150, H * 0.55, 60, '#e2574c', '#1b1b2f');
    g.strokeStyle = '#f4f1de'; g.lineWidth = 3; g.beginPath(); g.arc(W / 2, H * 0.48, 110, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    // the curtains, drawn back to both sides
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? 0 : W; const xin = W / 2 + s * 330;
      const cg = g.createLinearGradient(x0, 0, xin, 0); cg.addColorStop(0, '#5b0d16'); cg.addColorStop(1, '#b3192b'); g.fillStyle = cg;
      g.beginPath(); g.moveTo(x0, 0); g.lineTo(xin, 0); g.bezierCurveTo(xin - s * 40, H * 0.35, x0 + s * 300, H * 0.45, x0 + s * 250, H); g.lineTo(x0, H); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(40,0,8,0.45)'; g.lineWidth = 4;
      for (let k = 1; k < 7; k++) { const xx = x0 + s * k * 42; g.beginPath(); g.moveTo(xx, 0); g.quadraticCurveTo(xx + s * 30, H * 0.5, x0 + s * (120 + k * 18), H); g.stroke(); }
      // the giant hand gripping the curtain
      const hx = x0 + s * 250; const hy = H * 0.42;
      g.fillStyle = '#e7b48c'; g.beginPath(); g.ellipse(hx, hy, 52, 40, s * 0.3, 0, 7); g.fill();
      for (let f = 0; f < 4; f++) { g.beginPath(); g.ellipse(hx + s * (40 + f * 4), hy - 26 + f * 17, 26, 9, s * 0.2, 0, 7); g.fill(); }
      g.beginPath(); g.ellipse(hx - s * 10, hy - 38, 10, 24, -s * 0.5, 0, 7); g.fill();
      g.fillStyle = '#e7b48c'; g.fillRect(s < 0 ? hx - 120 : hx + 20, hy - 22, 100, 44); // forearm out of the frame
    }
    g.fillStyle = '#d9a441'; g.fillRect(0, 0, W, 10); // pelmet
  }),
  honour: () => canvas(512, 384, (g, W, H) => { // maroon honour board, gold lettering
    g.fillStyle = '#5e1620'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#d4a845'; g.lineWidth = 8; g.strokeRect(10, 10, W - 20, H - 20); g.lineWidth = 2; g.strokeRect(22, 22, W - 44, H - 44);
    g.fillStyle = '#e2bb5a'; g.textAlign = 'center'; g.font = 'bold 30px Georgia, serif'; g.fillText("STUDENTS' UNION", W / 2, 66); g.font = 'bold 24px Georgia, serif'; g.fillText('OF BITS PILANI', W / 2, 98);
    g.fillRect(W / 2 - 120, 112, 240, 3);
    for (let r = 0; r < 9; r++) { const y = 140 + r * 24; g.globalAlpha = 0.85; g.fillRect(52, y, 60, 8); g.fillRect(140, y, 150 + ((r * 37) % 80), 8); g.fillRect(W - 160, y, 100, 8); }
    g.globalAlpha = 1;
  }),
  chevron: () => canvas(256, 128, (g, W, H) => { // salmon band with the white zigzag frieze (one repeat = 1 m)
    g.fillStyle = '#d8a597'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#f2f2ee'; g.fillRect(0, 6, W, 8); g.fillRect(0, H - 14, W, 8);
    g.strokeStyle = '#f2f2ee'; g.lineWidth = 9;
    for (const off of [0, 30]) { g.beginPath(); for (let k = 0; k <= 4; k++) { const x = (k * W) / 4; const y = (k % 2 ? 32 : 92) + off * 0.35; if (k) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
  }),
  medallion: () => canvas(256, 256, (g, W) => { // square terracotta medallion with concentric circles
    g.fillStyle = '#b5653f'; g.fillRect(0, 0, W, W);
    g.strokeStyle = '#efd9c4'; g.lineWidth = 8; g.strokeRect(14, 14, W - 28, W - 28);
    for (const [r, c] of [[100, '#8f4a2c'], [78, '#d48a5e'], [56, '#8f4a2c'], [34, '#efd9c4'], [14, '#8f4a2c']]) { g.fillStyle = c; g.beginPath(); g.arc(W / 2, W / 2, r, 0, 7); g.fill(); }
  }),
  coffer: () => canvas(512, 512, (g, W) => { // portico soffit: white with four large oval recesses
    g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, W, W);
    for (const [x, y] of [[W * 0.27, W * 0.27], [W * 0.73, W * 0.27], [W * 0.27, W * 0.73], [W * 0.73, W * 0.73]]) {
      const gr = g.createRadialGradient(x, y, 10, x, y, 110); gr.addColorStop(0, '#d9dcdd'); gr.addColorStop(1, '#9ea5aa'); g.fillStyle = gr;
      g.beginPath(); g.ellipse(x, y, 100, 80, 0, 0, 7); g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.stroke();
    }
  }),
  signs: () => canvas(1024, 128 * SIGNS.length, (g, W) => {
    SIGNS.forEach(([, a, b, bg, fg], i) => {
      const y = i * 128; g.fillStyle = bg; g.fillRect(0, y, W, 128);
      g.strokeStyle = fg; g.globalAlpha = 0.5; g.lineWidth = 4; g.strokeRect(6, y + 6, W - 12, 116); g.globalAlpha = 1;
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      const fit = (text, size, cy, font) => { let s = size; do { g.font = `bold ${s}px ${font}`; s -= 2; } while (g.measureText(text).width > W * 0.9 && s > 10); g.fillText(text, W / 2, cy); };
      if (b) { fit(a, 56, y + 44, 'Georgia, serif'); fit(b, 34, y + 96, 'system-ui, sans-serif'); } else fit(a, 70, y + 66, 'Georgia, serif');
    });
  }),
};

export default {
  id: 'sac',
  name: 'Student Activities Centre (SAC)',
  category: 'hall',
  osm: ['Student Activities Center (SAC)', 'Looters'],
  floors: 1,
  enabled: true,
  research: 'mixed',
  frame: () => ({ O: [0, 0], eu: [1, 0], ev: [0, 1], angle: 0 }),
  build(kit, ctx) { buildSac(kit, ctx); },
};

function buildSac(kit, ctx) {
  const { campus, D } = ctx;
  seed = 11;
  for (const [name, make] of Object.entries(TEXTURES)) kit.texture(name, make);
  { // neon sign material (glows)
    const t = kit.textures.signs;
    kit.customMats.neon = new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.8, roughness: 0.6 });
  }
  const room = ctx.rooms.find((r) => r.id === 'auditorium');
  if (!room) throw new Error('sac: the auditorium room is missing');
  const AXIS = room.door.at; // the portico, lobby and both hall doors line up with the room's east door

  // ---------- primitives ----------
  const tileOf = (key) => { const k = key.replace(/^po:/, ''); return k.startsWith('x:') ? XT[k.slice(2)] || 1 : k.startsWith('t:') ? TEX_SIZE[k.split(':')[1]] || 2 : 1; };
  const textured = (key) => /^(po:)?(x:|t:)/.test(key);
  const B = (u0, u1, v0, v1, y0, y1, key, { collide = false, walkable = false } = {}) => {
    if (u1 < u0) [u0, u1] = [u1, u0];
    if (v1 < v0) [v0, v1] = [v1, v0];
    if (u1 - u0 < 1e-4 || v1 - v0 < 1e-4 || y1 - y0 < 1e-4) return;
    const g = textured(key) ? worldBoxGeometry(u1 - u0, y1 - y0, v1 - v0, tileOf(key)) : new THREE.BoxGeometry(u1 - u0, y1 - y0, v1 - v0);
    g.translate((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2);
    kit.geo(key, g);
    if (collide) kit.col(u0, u1, v0, v1, y0, y1, walkable);
  };
  const S = (u0, u1, v0, v1, y0, y1, key) => B(u0, u1, v0, v1, y0, y1, key, { collide: true });
  const FL = (u0, u1, v0, v1, y0, y1, key) => B(u0, u1, v0, v1, y0, y1, key, { collide: true, walkable: true });
  // polygon-offset copies of a material, for thin overlays (lawns, paving, court lines, mats)
  const po = (key) => {
    const k = `po:${key}`;
    if (!kit.customMats[k]) {
      const m = kit.material(key).clone();
      Object.assign(m, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 });
      kit.customMats[k] = m;
    }
    return k;
  };
  // horizontal plane, facing up (or down), world-metre UVs
  const flat = (u0, u1, v0, v1, y, key, { down = false, tile = null } = {}) => {
    const w = u1 - u0; const d = v1 - v0; const t = tile || tileOf(key);
    const g = new THREE.PlaneGeometry(w, d);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / t, (uv.getY(i) * d) / t);
    g.rotateX(down ? Math.PI / 2 : -Math.PI / 2); g.translate((u0 + u1) / 2, y, (v0 + v1) / 2);
    kit.geo(key, g);
  };
  // vertical plane facing [du, dv], centred at (u, v), bottom at y; repU/repV repeats of the texture
  const vplane = (u, v, y, w, h, [du, dv], key, { repU = 1, repV = 1, uv = null, offset = 0.012 } = {}) => {
    const g = new THREE.PlaneGeometry(w, h);
    const a = g.attributes.uv;
    for (let i = 0; i < a.count; i++) {
      const s = a.getX(i); const t = a.getY(i);
      if (uv) a.setXY(i, uv[0] + s * (uv[2] - uv[0]), uv[1] + t * (uv[3] - uv[1])); else a.setXY(i, s * repU, t * repV);
    }
    const n = Math.hypot(du, dv); du /= n; dv /= n;
    g.rotateY(Math.atan2(du, dv)); g.translate(u + du * offset, y + h / 2, v + dv * offset);
    kit.geo(key, g);
  };
  // a sign from the atlas
  const sign = (id, u, v, y, w, h, facing, key = K.signs) => {
    const i = SROW[id]; const N = SIGNS.length;
    vplane(u, v, y, w, h, facing, key, { uv: [0, 1 - (i + 1) / N, 1, 1 - i / N], offset: 0.02 });
  };
  // shape in the (x, y) plane extruded along +z from z0
  const extrudeXY = (pts, z0, depth, key) => {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(a, b))), { depth, bevelEnabled: false });
    g.translate(0, 0, z0); kit.geo(key, g);
  };
  // shape in the (z, y) plane extruded along -x, filling x1 - depth .. x1
  const extrudeZY = (pts, x1, depth, key) => {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(a, b))), { depth, bevelEnabled: false });
    g.rotateY(-Math.PI / 2); g.translate(x1, 0, 0); kit.geo(key, g);
  };
  // a box from p to q (in the vertical plane through them), thickness t across, height h (for sloped members)
  const beam = (p, q, w, h, key) => { // p, q: [x, y, z]
    const dx = q[0] - p[0]; const dy = q[1] - p[1]; const dz = q[2] - p[2];
    const L = Math.hypot(dx, dy, dz);
    const g = new THREE.BoxGeometry(w, h, L);
    const dir = new THREE.Vector3(dx, dy, dz).normalize();
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir));
    g.translate((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2);
    kit.geo(key, g);
  };
  // segmental arc: y at x for an arc from a to b at height y0 rising `rise` in the middle
  const segArc = (a, b, y0, rise) => {
    const half = (b - a) / 2; const R = (half * half + rise * rise) / (2 * rise); const m = (a + b) / 2;
    return (x) => y0 + Math.sqrt(Math.max(0, R * R - (x - m) * (x - m))) - (R - rise);
  };
  // hipped roof (a pyramid when square): eaves rectangle at y, rising h; flat-shaded, with the eave soffit
  const hip = (x0, x1, z0, z1, y, h, key) => {
    const cx = (x0 + x1) / 2; const cz = (z0 + z1) / 2; const w = x1 - x0; const d = z1 - z0; const Y = y + h;
    const k = Math.abs(w - d) / 2;
    const R0 = w >= d ? [cx - k, Y, cz] : [cx, Y, cz - k]; const R1 = w >= d ? [cx + k, Y, cz] : [cx, Y, cz + k];
    const A = [x0, y, z0]; const Bq = [x1, y, z0]; const C = [x1, y, z1]; const Dq = [x0, y, z1];
    const tris = w >= d ? [[A, Bq, R1], [A, R1, R0], [Bq, C, R1], [C, Dq, R0], [C, R0, R1], [Dq, A, R0]] : [[A, Bq, R0], [Bq, C, R1], [Bq, R1, R0], [C, Dq, R1], [Dq, A, R0], [Dq, R0, R1]];
    const pos = []; const uvs = []; const t = tileOf(key);
    const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
    const cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
    const push = (tri) => { for (const p of tri) { pos.push(...p); uvs.push((p[0] + p[2] * 0.3) / t, (p[2] - p[1] * 0.6) / t); } };
    for (let [a, b, c] of tris) {
      const n = cross(sub(b, a), sub(c, a));
      if (Math.hypot(...n) < 1e-6) continue;
      const g0 = [(a[0] + b[0] + c[0]) / 3 - cx, (a[1] + b[1] + c[1]) / 3 - (y - 1), (a[2] + b[2] + c[2]) / 3 - cz];
      if (n[0] * g0[0] + n[1] * g0[1] + n[2] * g0[2] < 0) [b, c] = [c, b];
      push([a, b, c]);
    }
    push([A, Bq, C]); push([A, C, Dq]); // soffit, facing down
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.computeVertexNormals();
    kit.geo(key, g);
  };
  // dark glazed window with a grille and a white surround in a wall opening (alongU: the wall runs along u)
  const win = (alongU, at, c, y, w, h, { out = 1, surround = 0.12, grille = true, thick = 0.25, key = K.glass } = {}) => {
    kit.window(alongU, at, c, y, w, h, { frame: K.white, glass: key, thick });
    const R = (a0, a1, b0, b1, y0, y1, k) => (alongU ? B(a0, a1, b0, b1, y0, y1, k) : B(b0, b1, a0, a1, y0, y1, k));
    const f = c + out * (thick / 2); const s = surround;
    if (s > 0) { // deep white surround, proud of the outer face
      R(at - w / 2 - s, at + w / 2 + s, f, f + out * 0.08, y - s, y, K.white);
      R(at - w / 2 - s, at + w / 2 + s, f, f + out * 0.08, y + h, y + h + s, K.white);
      R(at - w / 2 - s, at - w / 2, f, f + out * 0.08, y, y + h, K.white);
      R(at + w / 2, at + w / 2 + s, f, f + out * 0.08, y, y + h, K.white);
    }
    if (grille) R(at - w / 2, at + w / 2, c + out * 0.06, c + out * 0.075, y, y + h, K.grille);
  };
  const L = (name, fn) => kit.layer(name, fn);
  // kit.wall, but a door opening whose sill is a low step (bottom <= 0.6, the floor levels P, PV) gets a walkable
  // sill the full wall thickness, so you walk through instead of bumping into a 0.3-0.45 m kerb
  const W = (u0, v0, u1, v1, y0, y1, key, opts = {}) => {
    const ops = opts.openings || [];
    const low = (o) => (o.bottom ?? 0) > 0 && o.bottom <= 0.6 && opts.collide !== false;
    const w = kit.wall(u0, v0, u1, v1, y0, y1, key, { ...opts, openings: ops.map((o) => (low(o) ? { ...o, bottom: 0 } : o)) });
    const th = opts.thick ?? 0.25;
    for (const o of ops.filter(low)) {
      const a = w.s0 + o.at - o.width / 2; const b = w.s0 + o.at + o.width / 2;
      if (w.alongU) FL(a, b, w.c - th / 2, w.c + th / 2, y0, y0 + o.bottom, key); else FL(w.c - th / 2, w.c + th / 2, a, b, y0, y0 + o.bottom, key);
    }
    return w;
  };

  // =====================================================================================================
  // EAST HALL ("SAC inside"), round the gameplay room
  // =====================================================================================================
  const RX0 = room.x0; const RX1 = room.x1; const RZ0 = room.z0; const RZ1 = room.z1;
  const lin = { x0: RX0 - 0.1 - LIN, x1: RX1 + 0.1 + LIN, z0: RZ0 - 0.1 - LIN, z1: RZ1 + 0.1 + LIN }; // outside the room's walls
  const ARC_N = EH.z0 + 0.6; const ARC_S = EH.z1 - 0.6; // inner faces of the arcade piers
  const VEST = EH.x1 - 0.3; // inner face of the east wall
  // plinth floors (Kota with the marble inlay grid): north, south and west aisles and the east vestibule
  FL(EH.x0, VEST, EH.z0, lin.z0, 0, P, K.kota);
  FL(EH.x0, VEST, lin.z1, EH.z1, 0, P, K.kota);
  FL(EH.x0, lin.x0, lin.z0, lin.z1, 0, P, K.kota);
  const stepW = { z0: AXIS - 1.7, z1: AXIS + 1.7 }; // the three steps down to the room door
  FL(lin.x1 + 0.9, VEST, lin.z0, lin.z1, 0, P, K.kota);
  FL(lin.x1, lin.x1 + 0.9, lin.z0, stepW.z0, 0, P, K.kota);
  FL(lin.x1, lin.x1 + 0.9, stepW.z1, lin.z1, 0, P, K.kota);
  kit.flight(lin.x1, AXIS, 0, [1, 0], 3, P / 3, stepW.z1 - stepW.z0, K.kota, { tread: 0.3 });
  kit.stairs.push({ name: 'Steps down to the auditorium door', u0: lin.x1, u1: lin.x1 + 0.9, v0: stepW.z0, v1: stepW.z1, y0: 0, y1: P });
  flat(RX1 + 0.1, lin.x1, AXIS - 1.1, AXIS + 1.1, 0.035, po(K.kota)); // threshold in the lining
  // the lining: grey dado, white plaster above, up to the aisle ceilings (hides the room's own box and roof slab)
  const liningOps = [{ at: AXIS - lin.z0, width: 2.2, bottom: 0, top: 2.5 }];
  W(lin.x0 + LIN / 2, lin.z0, lin.x0 + LIN / 2, lin.z1, 0, EH.ceil, K.bluePl, { thick: LIN });
  W(lin.x1 - LIN / 2, lin.z0, lin.x1 - LIN / 2, lin.z1, 0, EH.ceil, K.bluePl, { thick: LIN, openings: liningOps });
  W(lin.x0 + LIN, lin.z0 + LIN / 2, lin.x1 - LIN, lin.z0 + LIN / 2, 0, EH.ceil, K.bluePl, { thick: LIN });
  W(lin.x0 + LIN, lin.z1 - LIN / 2, lin.x1 - LIN, lin.z1 - LIN / 2, 0, EH.ceil, K.bluePl, { thick: LIN });
  // grey dado and a white band on the lining's outer faces
  for (const [a0, a1, b, dir, alongU] of [[lin.x0, lin.x1, lin.z0, -1, true], [lin.x0, lin.x1, lin.z1, 1, true], [lin.z0, lin.z1, lin.x0, -1, false]]) {
    const R = (p0, p1, q0, q1, y0, y1, k) => (alongU ? B(p0, p1, q0, q1, y0, y1, k) : B(q0, q1, p0, p1, y0, y1, k));
    R(a0, a1, b, b + dir * 0.02, P, P + 1.1, K.dado);
    R(a0, a1, b, b + dir * 0.03, EH.arch - 0.1, EH.arch + 0.1, K.white);
  }
  B(lin.x1, lin.x1 + 0.02, lin.z0, AXIS - 1.1, P, P + 1.1, K.dado); B(lin.x1, lin.x1 + 0.02, AXIS + 1.1, lin.z1, P, P + 1.1, K.dado);
  kit.door(false, AXIS, lin.x1 - LIN / 2, 0, 2.2, { height: 2.5, thick: LIN, frame: K.frame, leaf: K.wood, side: 1 });

  // arcades: granite piers, segmental white arches and the plastered band, north and south
  const piers = []; for (let i = 0; i <= 6; i++) piers.push(EH.x0 + 0.3 + ((EH.x1 - EH.x0 - 0.6) * i) / 6);
  for (const [zf, zb] of [[EH.z0, ARC_N], [ARC_S, EH.z1]]) {
    for (const x of piers) {
      S(x - 0.3, x + 0.3, zf, zb, P, EH.arch, K.granite);
      B(x - 0.36, x + 0.36, zf - 0.06, zb + 0.06, P, P + 0.45, K.granDark); // base
      B(x - 0.38, x + 0.38, zf - 0.08, zb + 0.08, EH.arch - 0.18, EH.arch, K.white); // capital
    }
    for (let i = 0; i < 6; i++) {
      const c0 = piers[i]; const c1 = piers[i + 1]; const a = c0 + 0.3; const b = c1 - 0.3; const yArc = segArc(a, b, EH.arch, EH.rise);
      const pts = [[c0, EH.spring], [c0, EH.arch], [a, EH.arch]];
      for (let k = 1; k < 12; k++) { const x = a + ((b - a) * k) / 12; pts.push([x, yArc(x)]); }
      pts.push([b, EH.arch], [c1, EH.arch], [c1, EH.spring]);
      extrudeXY(pts, zf, zb - zf, K.white);
    }
    // ends of the band over the corner piers, and the cornice
    B(EH.x0, piers[0] , zf, zb, EH.arch, EH.spring, K.white);
    B(piers[6], EH.x1, zf, zb, EH.arch, EH.spring, K.white);
    B(EH.x0, EH.x1 + 0.15, zf - 0.15, zb + 0.15, EH.spring - 0.15, EH.spring, K.white);
  }
  // steps from the lawns up to the arcades (the whole length)
  kit.flight((piers[0] + piers[6]) / 2, EH.z0 - 0.9, 0, [0, 1], 3, P / 3, piers[6] - piers[0] + 0.6, K.step, { tread: 0.3 });
  kit.flight((piers[0] + piers[6]) / 2, EH.z1 + 0.9, 0, [0, -1], 3, P / 3, piers[6] - piers[0] + 0.6, K.step, { tread: 0.3 });

  // east wall: the wooden door to the lobby on the axis, grilled windows either side
  {
    const at = AXIS - EH.z0;
    W(EH.x1 - 0.15, EH.z0, EH.x1 - 0.15, EH.z1, 0, EH.spring, K.bluePl, { thick: 0.3, openings: [{ at, width: 3.0, bottom: P, top: P + 3.0 }, { at: at - 5.1, width: 1.4, bottom: P + 0.9, top: P + 2.4 }, { at: at + 5.1, width: 1.4, bottom: P + 0.9, top: P + 2.4 }] });
    for (const s of [-1, 1]) win(false, AXIS + s * 5.1, EH.x1 - 0.15, P + 0.9, 1.4, 1.5, { out: 1, thick: 0.3, surround: 0 });
    // 4-leaf panelled door, folded open into the hall
    for (const s of [-1, 1]) {
      const z = AXIS + s * 1.5;
      B(EH.x1 - 0.3 - 0.06, EH.x1, z - (s > 0 ? 0 : 0.08), z + (s > 0 ? 0.08 : 0), P, P + 3.06, K.frame);
      B(EH.x1 - 0.3 - 1.5, EH.x1 - 0.3, z - s * 0.05 - 0.025, z - s * 0.05 + 0.025, P, P + 2.95, K.wood);
    }
    B(EH.x1 - 0.36, EH.x1 + 0.02, AXIS - 1.58, AXIS + 1.58, P + 3.0, P + 3.08, K.frame);
  }
  // aisle ceilings (grey sheet underside on steel purlins), in the shell: you see them through the arcades
  const ceil = (u0, u1, v0, v1, along = 'u') => {
    B(u0, u1, v0, v1, EH.ceil, EH.ceil + 0.1, K.sheetUnder);
    if (along === 'u') for (let v = v0 + 0.6; v < v1 - 0.2; v += 1.2) B(u0, u1, v - 0.05, v + 0.05, EH.ceil - 0.12, EH.ceil, K.purlin);
    else for (let u = u0 + 0.6; u < u1 - 0.2; u += 1.2) B(u - 0.05, u + 0.05, v0, v1, EH.ceil - 0.12, EH.ceil, K.purlin);
  };
  ceil(EH.x0, VEST, ARC_N, lin.z0); ceil(EH.x0, VEST, lin.z1, ARC_S);
  ceil(EH.x0, lin.x0, lin.z0, lin.z1, 'v'); ceil(lin.x1, VEST, lin.z0, lin.z1, 'v');
  // the curved roof (segmental vault of steel arched trusses and sheeting), springing at 6 m, crown 8 m
  {
    const z0 = EH.z0 - 0.4; const z1 = EH.z1 + 0.4; const ya = segArc(z0, z1, EH.spring, EH.crown - EH.spring);
    const top = []; const bot = [];
    for (let k = 0; k <= 24; k++) { const z = z0 + ((z1 - z0) * k) / 24; top.push([z, ya(z) + 0.18]); bot.push([z, ya(z)]); }
    extrudeZY([...bot, ...top.reverse()], EH.x1 + 0.3, EH.x1 + 0.3 - EH.x0, K.sheet);
    // lunette closing the east end above the wall
    const lun = [[EH.z0, EH.spring], [EH.z1, EH.spring]];
    for (let k = 23; k >= 1; k--) { const z = z0 + ((z1 - z0) * k) / 24; if (z > EH.z0 && z < EH.z1) lun.push([z, ya(z) - 0.01]); }
    extrudeZY(lun, EH.x1, 0.3, K.bluePl);
    B(EH.x1 - 0.3, EH.x1 + 0.12, EH.z0, EH.z1, EH.spring - 0.12, EH.spring + 0.04, K.white);
    // solar panels on the east half
    for (let z = EH.z0 + 1.2; z < EH.z1 - 0.8; z += 1.85) {
      const y = ya(z) + 0.18 + 0.12; const slope = (ya(z + 0.05) - ya(z - 0.05)) / 0.1;
      const g = new THREE.BoxGeometry(15, 0.06, 1.65); g.rotateX(-Math.atan(slope)); g.translate(-149, y, z); kit.geo(K.pv, g);
      const f = new THREE.BoxGeometry(15.1, 0.03, 0.06); f.rotateX(-Math.atan(slope)); f.translate(-149, y + 0.035, z - 0.85); kit.geo(K.pvFrame, f);
    }
  }

  // ---------- hall interior (zone 'hall'): the room re-dressed as the real hall, aisles, honour boards ----------
  L('hall', () => {
    // Kota floor over the room's wooden floor; the curtain mural over its stage; tube lights; notice board
    flat(RX0 + 0.1, RX1 - 0.1, RZ0 + 0.1, RZ1 - 0.1, 0.045, po(K.kota));
    const wallIn = RX0 + 0.1; const span = RZ1 - RZ0 - 0.2;
    vplane(wallIn, (RZ0 + RZ1) / 2, 0.05, span, 3.1, [1, 0], K.mural, { offset: 0.008 });
    // the stage curtain (bits-world, 11 m wide at the stage) gets the same mural's centre on its face
    const cz0 = 299.05 - 296.6 + RZ0; const cz1 = cz0 + 11.1; const f0 = (cz0 - (RZ0 + 0.1)) / span; const f1 = (cz1 - (RZ0 + 0.1)) / span;
    vplane(RX0 + 0.36, (cz0 + cz1) / 2, 0.8, cz1 - cz0, 2.42, [1, 0], K.mural, { uv: [f0, 0.75 / 3.1, f1, 3.17 / 3.1], offset: 0.003 });
    for (const z of [RZ0 + 3.4, (RZ0 + RZ1) / 2, RZ1 - 3.4]) for (const x of [RX0 + 5, RX0 + 10, RX1 - 3]) kit.tubeLight(x, z, 3.2, [1, 0]);
    // yoga mats in front of the stage
    for (let i = 0; i < 4; i++) flat(RX0 + 4.6, RX0 + 6.4, RZ0 + 3.5 + i * 2.6, RZ0 + 4.2 + i * 2.6, 0.06, po('c:#f2c230'));
    // notice board case and fire extinguisher by the door, inside
    B(RX1 - 0.16, RX1 - 0.1, AXIS - 4.6, AXIS - 2.4, 1.0, 2.2, K.wood);
    B(RX1 - 0.17, RX1 - 0.16, AXIS - 4.5, AXIS - 2.5, 1.1, 2.1, 'c:#e9e2d0');
    kit.cyl(RX1 - 0.25, AXIS + 2.2, 0.35, 0.09, 0.55, K.red, { seg: 10 });
    // aisle lights, the honour boards on the west wall, stacked chairs and mats
    for (let x = EH.x0 + 3; x < VEST; x += 5) { kit.tubeLight(x, (ARC_N + lin.z0) / 2, EH.ceil - 0.12, [1, 0]); kit.tubeLight(x, (lin.z1 + ARC_S) / 2, EH.ceil - 0.12, [1, 0]); }
    for (const z of [lin.z0 + 3, AXIS, lin.z1 - 3]) { kit.tubeLight((EH.x0 + lin.x0) / 2, z, EH.ceil - 0.12, [0, 1]); kit.tubeLight((lin.x1 + VEST) / 2, z, EH.ceil - 0.12, [0, 1]); }
    for (const [i, z] of [AXIS - 4.6, AXIS, AXIS + 4.6].entries()) {
      B(EH.x0, EH.x0 + 0.06, z - 1.3, z + 1.3, P + 1.55, P + 3.45, K.frame);
      vplane(EH.x0 + 0.06, z, P + 1.6, 2.5, 1.8, [1, 0], K.honour, { offset: 0.006 });
      if (i === 1) sign('notices', EH.x0 + 0.06, z, P + 3.6, 1.6, 0.25, [1, 0]);
    }
    for (let k = 0; k < 6; k++) { // a stack of plastic chairs and rolled mats in the west aisle
      kit.chair(EH.x0 + 1.0, lin.z0 + 1.0 + k * 0.6, P, [1, 0], { seat: K.chairWhite, frame: K.chairWhite });
      kit.cyl(EH.x0 + 0.6, lin.z1 - 1.2 - k * 0.35, P, 0.15, 1.8, 'c:#f2c230', { seg: 10 });
    }
    S(EH.x0 + 2.2, EH.x0 + 3.0, AXIS - 1.0, AXIS + 1.0, P, P + 0.76, K.woodLt);
    // vestibule: a framed notice and the Students' Union board beside the room door
    vplane(lin.x1, AXIS - 3.3, P + 1.3, 1.6, 1.1, [1, 0], K.honour, { offset: 0.012 });
  });

  // =====================================================================================================
  // LOBBY AND PORTICO (east entrance)
  // =====================================================================================================
  const LB = { x0: EH.x1, x1: -131.0, z0: AXIS - 6, z1: AXIS + 6 }; // lobby box; its east wall is the portico back
  const PO = { x0: -131.0, x1: -127.0, op0: AXIS - 3, op1: AXIS + 3, top: 8.0, open: P + 4.5 };
  // lobby: walls, floor, ceiling, roof and parapet
  FL(LB.x0, LB.x1 - 0.3, LB.z0 + 0.3, LB.z1 - 0.3, 0, P, K.kota);
  W(LB.x0, LB.z0 + 0.15, LB.x1, LB.z0 + 0.15, 0, 6.5, K.bluePl, { thick: 0.3 });
  W(LB.x0, LB.z1 - 0.15, LB.x1, LB.z1 - 0.15, 0, 6.5, K.bluePl, { thick: 0.3 });
  B(LB.x0, LB.x1, LB.z0, LB.z1, 6.2, 6.5, K.creamC);
  for (const [a0, a1, b0, b1] of [[LB.x0, LB.x1, LB.z0, LB.z0 + 0.25], [LB.x0, LB.x1, LB.z1 - 0.25, LB.z1]]) { B(a0, a1, b0, b1, 6.5, 7.0, K.bluePl); B(a0, a1, b0 - 0.05, b1 + 0.05, 7.0, 7.1, K.white); }
  B(LB.x0 - 0.01, LB.x1 - 0.3, LB.z0 + 0.3, LB.z1 - 0.3, 4.8, 4.9, K.ceiling);
  // portico back wall: central wooden door (open), glazed side doors, the sign above
  {
    const c = LB.x1 - 0.15; const at0 = LB.z0 + 0.3; const len = LB.z1 - 0.3 - at0;
    W(c, at0, c, LB.z1 - 0.3, 0, 6.2, K.bluePl, { thick: 0.3, openings: [{ at: AXIS - at0, width: 3.0, bottom: P, top: P + 3.0 }, { at: AXIS - 2.25 - at0, width: 1.0, bottom: P, top: P + 2.6 }, { at: AXIS + 2.25 - at0, width: 1.0, bottom: P, top: P + 2.6 }] });
    void len;
    for (const s of [-1, 1]) {
      const z = AXIS + s * 2.25;
      kit.window(false, z, c, P, 1.0, 2.6, { frame: 'c:#3b3f44', glass: K.glazed, thick: 0.3 });
      B(c - 0.04, c + 0.04, z - 0.04, z + 0.04, P + 1.0, P + 1.05, 'c:#c9cdd1'); // push bar
      // the wooden leaves of the main door, folded back inside
      const zz = AXIS + s * 1.5;
      B(c - 0.15 - 1.5, c - 0.15, zz - s * 0.05 - 0.03, zz - s * 0.05 + 0.03, P, P + 2.95, K.wood);
      for (const y of [P + 0.4, P + 1.4]) B(c - 0.15 - 1.4, c - 0.15 - 0.1, zz - s * 0.05 - 0.05, zz - s * 0.05 + 0.05, y, y + 0.7, 't:wood:#6a4428');
      B(c - 0.2, c + 0.2, zz - (s > 0 ? 0 : 0.08), zz + (s > 0 ? 0.08 : 0), P, P + 3.05, K.frame);
    }
    B(c - 0.2, c + 0.2, AXIS - 1.58, AXIS + 1.58, P + 3.0, P + 3.08, K.frame);
    sign('sac', c + 0.15, AXIS, P + 3.18, 4.4, 1.05, [1, 0]);
  }
  // portico frame: battered grey-blue piers, the beam over the deep opening, white trim, chevron frieze, medallion
  {
    const bat = 0.28;
    extrudeZY([[LB.z0 - bat, 0], [PO.op0, 0], [PO.op0, PO.top], [LB.z0, PO.top]], PO.x1, PO.x1 - PO.x0, K.blue);
    extrudeZY([[PO.op1, 0], [LB.z1 + bat, 0], [LB.z1, PO.top], [PO.op1, PO.top]], PO.x1, PO.x1 - PO.x0, K.blue);
    kit.col(PO.x0, PO.x1, LB.z0 - 0.1, PO.op0, 0, PO.top); kit.col(PO.x0, PO.x1, PO.op1, LB.z1 + 0.1, 0, PO.top);
    B(PO.x0, PO.x1, PO.op0, PO.op1, PO.open, PO.top, K.blue);
    B(PO.x0 - 0.1, PO.x1 + 0.12, LB.z0 - 0.12, LB.z1 + 0.12, PO.top, PO.top + 0.22, K.white); // coping
    const fx = PO.x1; const E = [1, 0];
    // white trim: round the opening and round the two side panels
    B(fx, fx + 0.06, PO.op0 - 0.22, PO.op0, 0, PO.open + 0.22, K.white); B(fx, fx + 0.06, PO.op1, PO.op1 + 0.22, 0, PO.open + 0.22, K.white);
    B(fx, fx + 0.06, PO.op0 - 0.22, PO.op1 + 0.22, PO.open, PO.open + 0.22, K.white);
    for (const [z0, z1] of [[LB.z0 + 0.45, PO.op0 - 0.55], [PO.op1 + 0.55, LB.z1 - 0.45]]) {
      B(fx, fx + 0.05, z0 - 0.12, z1 + 0.12, 1.9, 2.02, K.white); B(fx, fx + 0.05, z0 - 0.12, z1 + 0.12, 5.38, 5.5, K.white);
      B(fx, fx + 0.05, z0 - 0.12, z0, 2.02, 5.38, K.white); B(fx, fx + 0.05, z1, z1 + 0.12, 2.02, 5.38, K.white);
      vplane(fx, (z0 + z1) / 2, 2.02, z1 - z0, 3.36, E, K.chevron, { repU: (z1 - z0) / 1.0, repV: 3.36 / 0.5, offset: 0.015 });
    }
    // the salmon chevron band across the top, between white bands, and the medallion over the opening
    B(fx, fx + 0.06, LB.z0 + 0.1, LB.z1 - 0.1, 6.45, 6.57, K.white); B(fx, fx + 0.06, LB.z0 + 0.1, LB.z1 - 0.1, 7.63, 7.75, K.white);
    vplane(fx, AXIS, 6.57, LB.z1 - LB.z0 - 0.2, 1.06, E, K.chevron, { repU: (LB.z1 - LB.z0 - 0.2) / 1.0, repV: 2, offset: 0.015 });
    B(fx, fx + 0.1, AXIS - 0.72, AXIS + 0.72, 4.98 + 0.25, 6.38, K.terra);
    vplane(fx + 0.1, AXIS, 5.29, 1.3, 1.03, E, K.medal, { offset: 0.004 });
    // the recess: oval-coffered soffit, marble landing
    flat(PO.x0, PO.x1, PO.op0, PO.op1, PO.open - 0.005, K.coffer, { down: true, tile: 1 });
    {
      const g = kit.parts.get('shell').get(K.coffer).at(-1); const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / (PO.x1 - PO.x0), uv.getY(i) / (PO.op1 - PO.op0));
    }
    FL(PO.x0, PO.x1, PO.op0, PO.op1, 0, P, K.marble);
    flat(LB.x1 - 0.3, PO.x0, AXIS - 1.5, AXIS + 1.5, P + 0.003, po(K.marble)); // door threshold
  }
  // steps (3 risers) either side of the central ramp, the ramp, planters and the sandstone lamp stands
  {
    const foot = PO.x1 + 1.2;
    kit.flight(foot, (LB.z0 + AXIS - 1.0) / 2, 0, [-1, 0], 3, P / 3, AXIS - 1.0 - LB.z0, K.step, { tread: 0.4 });
    kit.flight(foot, (LB.z1 + AXIS + 1.0) / 2, 0, [-1, 0], 3, P / 3, LB.z1 - AXIS - 1.0, K.step, { tread: 0.4 });
    for (let j = 0; j < 3; j++) for (const s of [-1, 1]) B(foot - j * 0.4 - 0.4, foot - j * 0.4, s < 0 ? LB.z0 : AXIS + 1.0, s < 0 ? AXIS - 1.0 : LB.z1, (j + 1) * 0.15 - 0.004, (j + 1) * 0.15 + 0.002, 'c:#e6e6e2'); // white joints
    const r0 = PO.x1 + 5.0; const n = 12; // ramp, 1:11, with stepped colliders under its face
    for (let k = 0; k < n; k++) kit.col(r0 - (k + 1) * (5.0 / n), r0 - k * (5.0 / n), AXIS - 1.0, AXIS + 1.0, 0, ((k + 1) * P) / n, true);
    beam([r0, P / 2 - 0.08, AXIS], [PO.x1, P / 2 - 0.08 + 0.0, AXIS], 2.0, 0.01, K.step); // placeholder, replaced below
    kit.parts.get('shell').get(K.step).pop();
    { const len = Math.hypot(5.0, P); const g = new THREE.BoxGeometry(len, 0.2, 2.0); g.rotateZ(Math.atan2(P, 5.0)); g.translate((r0 + PO.x1) / 2, P / 2 - 0.1, AXIS); kit.geo('c:#8f9496', g); }
    for (const s of [-1, 1]) { // ramp kerbs
      const z = AXIS + s * 1.05; const len = Math.hypot(5.0, P); const g = new THREE.BoxGeometry(len, 0.3, 0.1); g.rotateZ(Math.atan2(P, 5.0)); g.translate((r0 + PO.x1) / 2, P / 2 + 0.05, z); kit.geo(K.white, g);
    }
    for (const s of [-1, 1]) {
      const z = AXIS + s * 7.6;
      S(-128.9, -126.4, z - 1.1, z + 1.1, 0, 0.7, K.blue); B(-128.95, -126.35, z - 1.15, z + 1.15, 0.7, 0.78, K.white); // planter
      for (const dz of [-0.55, 0.55]) { const sp = new THREE.SphereGeometry(0.5, 10, 8); sp.scale(1, 1.15, 1); sp.translate(-127.65, 1.3, z + dz); kit.geo(K.hedge, sp); }
      S(-125.4, -124.9, AXIS + s * 6.6 - 0.25, AXIS + s * 6.6 + 0.25, 0, 1.7, K.sand); // red sandstone lamp stand
      B(-125.5, -124.8, AXIS + s * 6.6 - 0.35, AXIS + s * 6.6 + 0.35, 1.7, 1.82, K.sand);
      const gl = new THREE.SphereGeometry(0.22, 12, 10); gl.translate(-125.15, 2.05, AXIS + s * 6.6); kit.geo(K.lamp, gl);
    }
  }

  // =====================================================================================================
  // EAST WINGS (either side of the lobby): hipped, single storey, closed
  // =====================================================================================================
  for (const s of [-1, 1]) {
    const zIn = s < 0 ? LB.z0 : LB.z1; const zOut = s < 0 ? 284.0 : 325.0; const z0 = Math.min(zIn, zOut); const z1 = Math.max(zIn, zOut);
    const x0 = EH.x1; const x1 = -129.0; const t = 0.3; const H = 4.0;
    W(x0, s < 0 ? z0 + t / 2 : z1 - t / 2, x1, s < 0 ? z0 + t / 2 : z1 - t / 2, 0, H, K.bluePl, { thick: t, openings: [{ at: 3.5, width: 1.2, bottom: 1.2, top: 2.4 }, { at: 8.0, width: 1.2, bottom: 1.2, top: 2.4 }] });
    for (const at of [3.5, 8.0]) win(true, x0 + at, s < 0 ? z0 + t / 2 : z1 - t / 2, 1.2, 1.2, 1.2, { out: s, thick: t, surround: 0.22 });
    const ex = x1 - t / 2;
    const ews = [z0 + 2.4, (z0 + z1) / 2, z1 - 2.4];
    W(ex, z0, ex, z1, 0, H, K.bluePl, { thick: t, openings: ews.map((z) => ({ at: z - z0, width: 1.2, bottom: 1.2, top: 2.4 })) });
    for (const z of ews) win(false, z, ex, 1.2, 1.2, 1.2, { out: 1, thick: t, surround: 0.22 });
    const wz0 = s < 0 ? z0 : EH.z1; const wz1 = s < 0 ? EH.z0 : z1; // west wall where the hall does not close it
    W(x0 + t / 2, wz0, x0 + t / 2, wz1, 0, H, K.bluePl, { thick: t });
    // plinth band and white cornice
    B(x0, x1 + 0.04, s < 0 ? z0 - 0.04 : z1 - 0.01, s < 0 ? z0 + 0.01 : z1 + 0.04, 0, 0.55, K.plinth);
    B(x1 - 0.01, x1 + 0.04, z0, z1, 0, 0.55, K.plinth);
    B(x0, x1 + 0.1, z0 - 0.1, z1 + 0.1, H, H + 0.12, K.white);
    // two hipped units, white fascia, a small medallion on each east face
    const zm = (z0 + z1) / 2;
    for (const [a, b] of [[z0, zm], [zm, z1]]) {
      hip(x0 - 0.1, x1 + 0.45, a - (a === z0 ? 0.45 : 0), b + (b === z1 ? 0.45 : 0), H + 0.12, 1.7, K.roofTile);
      B(x1 + 0.02, x1 + 0.1, (a + b) / 2 - 0.3, (a + b) / 2 + 0.3, 3.1, 3.7, K.terra);
    }
    B(x1 + 0.4, x1 + 0.48, z0 - 0.45, z1 + 0.45, H, H + 0.14, K.white);
  }

  // =====================================================================================================
  // FORECOURT (pink stamped concrete to the road), bicycle racks, round planters
  // =====================================================================================================
  {
    const roadX = (z) => -102.4 + ((-151.5 + 102.4) / (75.8 - 371)) * (z - 371) - 2.2; // west edge of the service road
    const zs = [288, 321];
    const sh = new THREE.Shape([[-129, -zs[0]], [roadX(zs[0]), -zs[0]], [roadX(zs[1]), -zs[1]], [-129, -zs[1]]].map(([a, b]) => new THREE.Vector2(a, b)));
    const g = new THREE.ShapeGeometry(sh); const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / XT.stamped, uv.getY(i) / XT.stamped);
    g.rotateX(-Math.PI / 2); g.translate(0, 0.035, 0); kit.geo(po(K.stamped), g);
    for (const z of [AXIS - 3.6, AXIS + 3.6]) flat(PO.x1 + 1.3, PO.x1 + 3.2, z - 0.9, z + 0.9, 0.04, po(K.rubber)); // floor mats
    for (const [x, z] of [[-120.5, 293.5], [-119.8, 315.5]]) {
      kit.cyl(x, z, 0, 1.3, 0.5, K.bluePl, { seg: 20, collide: true }); kit.cyl(x, z, 0.5, 1.2, 0.02, 'c:#5a4632', { seg: 20 });
      const sp = new THREE.SphereGeometry(0.9, 10, 8); sp.scale(1, 0.7, 1); sp.translate(x, 0.95, z); kit.geo(K.hedge, sp);
    }
    for (let i = 0; i < 6; i++) { // black steel-hoop racks with a few bicycles
      const x = -127.5 + i * 1.0; const z = 289.6;
      const hoop = new THREE.TorusGeometry(0.4, 0.025, 6, 12, Math.PI); hoop.translate(x, 0.0, z); kit.geo(K.black, hoop);
      if (i % 2 === 0) {
        for (const dz of [-0.5, 0.5]) { const w = new THREE.TorusGeometry(0.33, 0.03, 6, 14); w.rotateY(Math.PI / 2); w.translate(x + 0.15, 0.36, z + dz); kit.geo(K.black, w); }
        beam([x + 0.15, 0.6, z - 0.45], [x + 0.15, 0.8, z + 0.4], 0.04, 0.04, 'c:#1c4d8c');
        beam([x + 0.15, 0.4, z], [x + 0.15, 0.8, z + 0.4], 0.04, 0.04, 'c:#1c4d8c');
      }
    }
    kit.col(-128, -121.6, 289.3, 289.9, 0, 0.8);
  }

  // =====================================================================================================
  // WEST BLOCK: indoor sports halls (badminton + Martial Arts mezzanine, table tennis, squash)
  // =====================================================================================================
  {
    const { x0, x1, z0, z1, eave, ridge } = WB; const t = 0.3; const xm = (x0 + x1) / 2;
    FL(x0, x1, z0, z1, 0, P, 't:concrete:#b9bdb8');
    const lowWin = (len) => { const a = []; for (let s = 2.4; s < len - 1.5; s += 4.4) a.push(s); return a; };
    // west wall: low grilled windows and a clerestory band
    {
      const ops = []; for (const at of lowWin(z1 - z0)) ops.push({ at, width: 1.6, bottom: P + 1.1, top: P + 2.3 }, { at, width: 2.6, bottom: 6.4, top: 7.9 });
      W(x0 + t / 2, z0, x0 + t / 2, z1, 0, eave, K.bluePl, { thick: t, openings: ops });
      for (const at of lowWin(z1 - z0)) { win(false, z0 + at, x0 + t / 2, P + 1.1, 1.6, 1.2, { out: -1, thick: t, surround: 0.1 }); win(false, z0 + at, x0 + t / 2, 6.4, 2.6, 1.5, { out: -1, thick: t, surround: 0, grille: false }); }
    }
    W(x1 - t / 2, z0, x1 - t / 2, z1, 0, eave, K.bluePl, { thick: t });
    for (const [z, out, door] of [[z0 + t / 2, -1, -186], [z1 - t / 2, 1, -186]]) {
      const ats = [3.0, 7.4, 20.0, 24.4]; const ops = [{ at: door - x0, width: 2.4, bottom: P, top: P + 2.7 }];
      for (const at of ats) ops.push({ at, width: 1.6, bottom: P + 1.1, top: P + 2.3 }, { at, width: 2.6, bottom: 6.4, top: 7.9 });
      W(x0, z, x1, z, 0, eave, K.bluePl, { thick: t, openings: ops });
      for (const at of ats) { win(true, x0 + at, z, P + 1.1, 1.6, 1.2, { out, thick: t, surround: 0.1 }); win(true, x0 + at, z, 6.4, 2.6, 1.5, { out, thick: t, surround: 0, grille: false }); }
      kit.door(true, door, z, P, 2.4, { height: 2.7, thick: t, frame: K.frame, leaf: 'c:#6f7a80', side: -out });
      kit.flight(door, z + out * (t / 2 + 0.9), 0, [0, -out], 3, P / 3, 3.4, K.step, { tread: 0.3 });
      B(door - 1.9, door + 1.9, z + out * (t / 2), z + out * (t / 2 + 1.3), 3.3, 3.45, K.white); // canopy over the door
      sign(out < 0 ? 'badminton' : 'tthall', door, z + out * (t / 2 + 0.01), 3.48, 3.2, 0.42, [0, out]);
    }
    // plinth band and gable ends
    for (const [a0, a1, b0, b1] of [[x0 - 0.04, x1, z0 - 0.04, z0], [x0 - 0.04, x1, z1, z1 + 0.04], [x0 - 0.04, x0, z0, z1]]) B(a0, a1, b0, b1, 0, 0.6, K.plinth);
    const gy = (x) => eave + ((ridge - eave) * (1 - Math.abs(x - xm) / (xm - x0 + 0.5))) - 0.06;
    for (const z of [z0, z1 - t, WB.part]) extrudeXY([[x0 + (z === WB.part ? t : 0), eave], [x1 - (z === WB.part ? t : 0), eave], [x1 - (z === WB.part ? t : 0), gy(x1)], [xm, gy(xm)], [x0 + (z === WB.part ? t : 0), gy(x0)]], z, z === WB.part ? 0.25 : t, K.bluePl);
    B(x0 - 0.06, x1 + 0.06, z0 - 0.06, z1 + 0.06, eave - 0.25, eave - 0.1, K.white);
    // the roof: two slopes of blue-grey sheeting, ridge north-south, three solar strips
    const run = xm - x0 + 0.5; const len = Math.hypot(run, ridge - eave); const ang = Math.atan2(ridge - eave, run);
    for (const s of [-1, 1]) {
      const g = worldBoxGeometry(len, 0.12, z1 - z0 + 1.2, XT.sheet); g.rotateZ(-s * ang); g.translate(xm + s * run / 2, (eave + ridge) / 2 + 0.06, (z0 + z1) / 2); kit.geo(K.sheet, g);
      for (const f of s < 0 ? [0.3, 0.68] : [0.45]) {
        const d = run * f; const y = ridge - (ridge - eave) * f + 0.2;
        const p = new THREE.BoxGeometry(3.4, 0.07, z1 - z0 - 3); p.rotateZ(-s * ang); p.translate(xm + s * d, y, (z0 + z1) / 2); kit.geo(K.pv, p);
        for (let z = z0 + 2.6; z < z1 - 1.5; z += 1.7) { const q = new THREE.BoxGeometry(3.42, 0.02, 0.05); q.rotateZ(-s * ang); q.translate(xm + s * d, y + 0.04, z); kit.geo(K.pvFrame, q); }
      }
    }
    B(xm - 0.25, xm + 0.25, z0 - 0.6, z1 + 0.6, ridge + 0.02, ridge + 0.2, 'c:#7d8b97');
    // partition between the badminton and table-tennis halls (door at x -178)
    W(x0 + t, WB.part + 0.125, x1 - t, WB.part + 0.125, P, eave, K.bluePl, { thick: 0.25, openings: [{ at: -178 - (x0 + t), width: 2.0, bottom: 0, top: 2.5 }] });
    kit.door(true, -178, WB.part + 0.125, P, 2.0, { height: 2.5, thick: 0.25, frame: K.frame, leaf: 'c:#6f7a80', side: 1 });
    kit.room('martial', 'Martial Arts (mezzanine)', -174.2, x1 - t, z0 + t, WB.part, M, eave, 1);
    kit.room('badminton', 'Badminton hall', x0 + t, x1 - t, z0 + t, WB.part, P, eave);
    kit.room('tt', 'Table tennis hall', -190, x1 - t, WB.part + 0.25, z1 - t, P, eave);
    kit.room('squash', 'Squash court', x0 + t, -190, WB.part + 0.25, 315.65, P, eave);

    L('sports', () => {
      const ix0 = x0 + t; const ix1 = x1 - t; const iz0 = z0 + t; const iz1 = z1 - t;
      // teal walls with a grey dado inside
      const skin = (a0, a1, b, alongU, dir, y0 = P) => { const R = (p0, p1, q0, q1, ya, yb, k) => (alongU ? B(p0, p1, q0, q1, ya, yb, k) : B(q0, q1, p0, p1, ya, yb, k)); R(a0, a1, b, b + dir * 0.015, y0, y0 + 1.2, K.dado); };
      skin(ix0, ix1, iz0, true, 1); skin(ix0, ix1, iz1, true, -1); skin(iz0, iz1, ix0, false, 1); skin(iz0, iz1, ix1, false, -1);
      skin(ix0, ix1, WB.part, true, -1); skin(ix0, ix1, WB.part + 0.25, true, 1);
      // badminton: green synthetic floor, three courts with nets, wooden benches
      flat(ix0, ix1, iz0, WB.part, P + 0.004, po(K.court));
      const courts = [-198.2, -190.1, -182.0];
      for (const cx of courts) {
        const g = new THREE.PlaneGeometry(6.1, 13.4); g.rotateX(-Math.PI / 2); g.translate(cx + 3.05, P + 0.008, 293.0 + 6.7); kit.geo(po(K.courtLine), g);
        for (const x of [cx - 0.1, cx + 6.2]) kit.cyl(x, 299.7, P, 0.03, 1.55, K.steel, { seg: 6 });
        vplane(cx + 3.05, 299.7, P + 0.79, 6.1, 0.76, [0, 1], 'x:net', { repU: 6.1 / XT.net, repV: 0.76 / XT.net, offset: 0 });
        B(cx, cx + 6.1, 299.69, 299.71, P + 1.5, P + 1.55, K.netW);
      }
      for (const z of [294, 300.5]) S(ix0 + 0.15, ix0 + 0.55, z, z + 4, P, P + 0.45, K.woodLt);
      for (const x of [-198, -192, -186]) S(x, x + 4, WB.part - 0.55, WB.part - 0.15, P, P + 0.45, K.woodLt);
      // steel trusses (rust red) every 5 m with tube lights and exhaust fans
      for (let z = z0 + 2.5; z < z1; z += 5) {
        B(ix0, ix1, z - 0.07, z + 0.07, 8.45, 8.6, K.truss);
        for (const s of [-1, 1]) beam([xm + s * (xm - ix0), gy(ix0) - 0.25, z], [xm, gy(xm) - 0.25, z], 0.14, 0.16, K.truss);
        for (let x = ix0 + 2.4; x < ix1 - 1; x += 2.4) beam([x, 8.6, z], [x, gy(x) - 0.3, z], 0.08, 0.08, K.truss);
        for (let x = ix0 + 3.5; x < ix1 - 2; x += 6) kit.tubeLight(x, z + 0.15, 8.45, [1, 0]);
      }
      for (const z of [296, 316]) { kit.cyl(ix0 + 0.05, z, 7.0, 0.45, 0.06, 'c:#9aa1a6', { seg: 14 }); }
      // the stair to the Martial Arts mezzanine (along the north wall, climbing east) and its rail
      const steps = 22; const rise = (M - P) / steps; const tread = 0.28; const sx = -174.2 - steps * tread; const sz = iz0 + 0.65;
      kit.flight(sx, sz, P, [1, 0], steps, rise, 1.2, K.terrazzo, { tread });
      kit.stairs.push({ name: 'Martial Arts mezzanine stair', u0: sx, u1: -174.2, v0: iz0 + 0.05, v1: iz0 + 1.25, y0: P, y1: M });
      for (let j = 0; j < steps; j++) kit.col(sx + j * tread, sx + (j + 1) * tread, iz0 + 1.25, iz0 + 1.32, P + (j + 1) * rise, P + (j + 1) * rise + 0.95);
      beam([sx, P + 1.0, iz0 + 1.29], [-174.2, M + 1.0, iz0 + 1.29], 0.05, 0.05, K.steel);
      for (let j = 0; j <= steps; j += 4) { const x = sx + j * tread + 0.14; beam([x, P + (j + 1) * rise, iz0 + 1.29], [x, P + (j + 1) * rise + 1.0, iz0 + 1.29], 0.04, 0.04, K.steel); }
      // the mezzanine: slab on columns, the gallery wall with large openings onto the hall, foam mats, punch bags
      FL(-174.2, ix1, iz0, WB.part, M - 0.25, M, 't:concrete:#c4c7c2');
      for (const z of [295.5, 301, 306.5]) S(-174.2, -173.9, z - 0.15, z + 0.15, P, M - 0.25, K.creamC);
      const gw = []; for (let at = 3.6; at < WB.part - iz0 - 1.5; at += 3.4) gw.push({ at, width: 2.6, bottom: 1.0, top: 2.7 });
      W(-174.1, iz0, -174.1, WB.part, M, 8.45, K.bluePl, { thick: 0.2, openings: [{ at: 0.65, width: 1.2, bottom: 0, top: 2.3 }, ...gw] });
      for (const o of gw) { B(-174.24, -173.96, iz0 + o.at - 1.3, iz0 + o.at + 1.3, M + 0.95, M + 1.05, K.steel); }
      flat(-173.95, ix1 - 0.05, iz0 + 1.4, WB.part - 0.1, M + 0.006, po(K.mats));
      for (const z of [295, 299, 303]) { kit.cyl(ix1 - 1.2, z, M + 0.6, 0.18, 1.1, 'c:#b3261e', { seg: 10 }); kit.cyl(ix1 - 1.2, z, M + 1.7, 0.012, 8.45 - M - 1.7, K.steel, { seg: 4 }); }
      B(ix1 - 0.02, ix1, iz0 + 2, iz0 + 8, M + 0.3, M + 2.3, K.mirror);
      sign('martial', -174.21, (iz0 + WB.part) / 2, M + 2.8, 2.6, 0.4, [-1, 0]);
      // table tennis: blue surround, green play areas, four blue tables (E to play), white plastic chairs
      flat(-189.95, ix1, WB.part + 0.25, iz1, P + 0.004, po(K.ttBlue));
      for (const [cx, cz] of [[-183.5, 313.2], [-176.5, 313.2], [-183.5, 320.6], [-176.5, 320.6]]) {
        flat(cx - 2.6, cx + 2.6, cz - 3.2, cz + 3.2, P + 0.008, po(K.ttGreen));
        B(cx - 0.76, cx + 0.76, cz - 1.37, cz + 1.37, P + 0.72, P + 0.76, K.ttTop, { collide: true });
        B(cx - 0.765, cx + 0.765, cz - 0.01, cz + 0.01, P + 0.76, P + 0.92, K.netW);
        B(cx - 0.01, cx + 0.01, cz - 1.37, cz + 1.37, P + 0.761, P + 0.765, K.netW);
        for (const [dx, dz] of [[-0.6, -1.1], [0.6, -1.1], [-0.6, 1.1], [0.6, 1.1]]) B(cx + dx - 0.03, cx + dx + 0.03, cz + dz - 0.03, cz + dz + 0.03, P, P + 0.72, K.red);
        kit.interact('tt', cx + 1.4, cz, 'Play table tennis', { y: P + 1.2, radius: 1.9 });
      }
      for (let x = -188; x < -172; x += 0.7) kit.chair(x, iz1 - 0.4, P, [0, -1], { seat: K.chairWhite, frame: K.chairWhite });
      // squash: maple floor, white walls with red lines, glass back wall with a door, viewing area
      const sq = { x0: ix0, x1: -190, z0: WB.part + 0.25, z1: 315.65 };
      flat(sq.x0, sq.x1, sq.z0, sq.z1, P + 0.006, po(K.maple));
      W(sq.x0, sq.z1 + 0.1, -186.5, sq.z1 + 0.1, P, P + 5.6, K.squashW, { thick: 0.2 });
      for (const z of [sq.z0 + 0.01, sq.z1 - 0.01]) B(sq.x0, sq.x1, z - 0.005, z + 0.005, P, P + 5.6, K.squashW);
      B(sq.x0 + 0.005, sq.x0 + 0.02, sq.z0, sq.z1, P, P + 5.6, K.squashW);
      B(sq.x0 + 0.02, sq.x0 + 0.03, sq.z0, sq.z1, P + 4.52, P + 4.57, K.red); B(sq.x0 + 0.02, sq.x0 + 0.03, sq.z0, sq.z1, P + 1.78, P + 1.83, K.red); B(sq.x0 + 0.02, sq.x0 + 0.03, sq.z0, sq.z1, P + 0.43, P + 0.48, K.red);
      flat(sq.x0 + 5.44 - 0.025, sq.x0 + 5.44 + 0.025, sq.z0, sq.z1, P + 0.009, po(K.red)); flat(sq.x0 + 5.44, sq.x1, (sq.z0 + sq.z1) / 2 - 0.025, (sq.z0 + sq.z1) / 2 + 0.025, P + 0.009, po(K.red));
      W(sq.x1 + 0.05, sq.z0, sq.x1 + 0.05, sq.z1, P, P + 2.13, K.glazed, { thick: 0.1, openings: [{ at: (sq.z1 - sq.z0) / 2, width: 0.9, bottom: 0, top: 2.0 }] });
      B(sq.x1, sq.x1 + 0.1, sq.z0, sq.z1, P + 2.13, P + 2.25, K.steel);
      B(-189.9, -186.5, sq.z1 + 0.2, sq.z1 + 0.22, P, P + 3.0, 'c:#2f5f9f'); // blue wall of the viewing area
      S(-189.6, -187.0, sq.z1 - 0.6, sq.z1 - 0.2, P, P + 0.45, K.woodLt);
    });
  }

  // =====================================================================================================
  // COVERED CORRIDORS (brick jali), LAWNS AND PAVING
  // =====================================================================================================
  // corridor: floor slab, flat roof with a white fascia, square piers; jali screens on the `screen` side between the
  // piers, except across the gaps listed in `open` ([a, b] along the corridor)
  const corridor = (u0, u1, v0, v1, { screen = null, open = [], piersOn = ['a', 'b'] } = {}) => {
    const alongU = u1 - u0 >= v1 - v0;
    FL(u0, u1, v0, v1, 0, CF, K.corridor);
    B(u0 - 0.2, u1 + 0.2, v0 - 0.2, v1 + 0.2, 3.2, 3.4, K.creamC);
    B(u0 - 0.25, u1 + 0.25, v0 - 0.25, v1 + 0.25, 3.32, 3.48, K.white);
    const [a0, a1] = alongU ? [u0, u1] : [v0, v1]; const [b0, b1] = alongU ? [v0, v1] : [u0, u1];
    const n = Math.max(1, Math.round((a1 - a0) / 3.6)); const step = (a1 - a0) / n;
    const R = (p0, p1, q0, q1, y0, y1, k, o) => (alongU ? B(p0, p1, q0, q1, y0, y1, k, o) : B(q0, q1, p0, p1, y0, y1, k, o));
    for (const side of piersOn) {
      const q0 = side === 'a' ? b0 : b1 - 0.35; const q1 = q0 + 0.35;
      for (let i = 0; i <= n; i++) { const p = Math.min(a1 - 0.35, Math.max(a0, a0 + i * step - 0.175)); R(p, p + 0.35, q0, q1, CF, 3.2, K.granite, { collide: true }); }
      if (side === screen) {
        for (let i = 0; i < n; i++) {
          const p0 = a0 + i * step + 0.175; const p1 = a0 + (i + 1) * step - 0.175;
          if (open.some(([x, y]) => (p0 + p1) / 2 > x && (p0 + p1) / 2 < y)) continue;
          R(p0, p1, q0 + 0.05, q1 - 0.05, CF, CF + 0.9, K.brick, { collide: true });
          R(p0, p1, q0 + 0.16, q1 - 0.16, CF + 0.9, 2.75, K.jali, { collide: true });
          R(p0, p1, q0 + 0.05, q1 - 0.05, 2.75, 3.2, K.brick);
        }
      }
    }
  };
  corridor(-205, EH.x1, 279.0, 282.5, { screen: 'a', open: [[-191, -187], [-162, -150], [-147, -140]] });
  corridor(-144.5, EH.x1, 282.5, EH.z0 - 0.9, { piersOn: ['a'] });
  corridor(-205, EH.x1, 326.5, 330.0, { screen: 'b', open: [[-180, -176], [-153, -140]] });
  corridor(-144.5, EH.x1, EH.z1 + 0.9, 326.5, { piersOn: ['a'] });
  corridor(-191, -187, 253, 279, { piersOn: [] });
  corridor(-180, -176, 330, 356.5, { piersOn: [] });
  // lawns (replacing the OSM grass that ran under the halls), paved courts, hedges
  flat(-168.5, -144.5, 282.5, EH.z0 - 0.9, 0.03, po(K.grass));
  flat(-168.5, -144.5, EH.z1 + 0.9, 326.5, 0.03, po(K.grass));
  flat(-205, -168.5, 282.5, WB.z0, 0.028, po(K.paving));
  flat(-205, -168.5, WB.z1, 326.5, 0.028, po(K.paving));
  flat(-169, -132, 266, 279, 0.028, po(K.paving));
  flat(-153, -127, 330, 348.5, 0.028, po(K.paving));
  for (const [z0, z1] of [[282.7, 283.3], [325.7, 326.3]]) B(-168.3, -145, z0, z1, 0, 0.55, K.hedge, { collide: true });

  // =====================================================================================================
  // CLUB PAVILIONS (barrel-vaulted rooms, terracotta hipped roofs)
  // =====================================================================================================
  const pavilion = ({ x0, x1, z0, z1, doorX, sign: sg, layer, wall = K.cream, rib = K.orange, vault = K.creamC, fit }) => {
    const t = 0.25; const H = 3.6; const HE = 3.85; const open = !!layer;
    const doorZ = (z0 + z1) / 2; const dw = 1.6;
    const doorSide = Math.abs(doorX - x0) < Math.abs(doorX - x1) ? 'w' : 'e';
    if (open) FL(x0, x1, z0, z1, 0, PV, K.terrazzo);
    const winsN = [x0 + 3.5, x1 - 3.5]; const opsN = winsN.map((x) => ({ at: x - x0, width: 1.3, bottom: PV + 1.0, top: PV + 2.3 }));
    for (const [z, out] of [[z0 + t / 2, -1], [z1 - t / 2, 1]]) {
      W(x0, z, x1, z, 0, H, wall, { thick: t, openings: opsN });
      for (const x of winsN) win(true, x, z, PV + 1.0, 1.3, 1.3, { out, thick: t, surround: 0.1 });
    }
    for (const side of ['w', 'e']) {
      const c = side === 'w' ? x0 + t / 2 : x1 - t / 2;
      const ops = open && side === doorSide ? [{ at: doorZ - z0 - t, width: dw, bottom: PV, top: PV + 2.4 }] : [];
      W(c, z0 + t, c, z1 - t, 0, HE, wall, { thick: t, openings: ops });
      if (side === doorSide) {
        const out = side === 'w' ? -1 : 1;
        if (open) kit.door(false, doorZ, c, PV, dw, { height: 2.4, thick: t, frame: K.frame, leaf: 'c:#7d858c', side: -out });
        else B(c + out * (t / 2), c + out * (t / 2 + 0.05), doorZ - dw / 2, doorZ + dw / 2, PV, PV + 2.4, 'c:#7d858c');
        sign(sg, c + out * (t / 2), doorZ, PV + 2.55, 2.4, 0.36, [out, 0]);
      }
    }
    B(x0 - 0.03, x1 + 0.03, z0 - 0.03, z1 + 0.03, 0, 0.5, K.plinth);
    B(x0 - 0.08, x1 + 0.08, z0 - 0.08, z1 + 0.08, H - 0.12, H, K.white);
    hip(x0 - 0.4, x1 + 0.4, z0 - 0.4, z1 + 0.4, H, 2.0, K.roofTile);
    if (!open) return;
    L(layer, () => {
      // interior skin over the walls, the vault (chords) with painted arch ribs, lights and fans
      const ix0 = x0 + t; const ix1 = x1 - t; const iz0 = z0 + t; const iz1 = z1 - t;
      for (const [z, d] of [[iz0, 1], [iz1, -1]]) W(ix0, z + d * 0.011, ix1, z + d * 0.011, PV, 3.1, wall, { thick: 0.02, openings: opsN.map((o) => ({ ...o, at: o.at - t, bottom: o.bottom - PV, top: o.top - PV })), collide: false });
      for (const [x, d] of [[ix0, 1], [ix1, -1]]) W(x + d * 0.011, iz0, x + d * 0.011, iz1, PV, HE - 0.02, wall, { thick: 0.02, openings: (x < (x0 + x1) / 2 ? doorSide === 'w' : doorSide === 'e') ? [{ at: doorZ - iz0, width: dw, bottom: 0, top: 2.4 }] : [], collide: false });
      const ya = segArc(iz0, iz1, 3.1, 0.7); const n = 10;
      for (let k = 0; k < n; k++) {
        const za = iz0 + ((iz1 - iz0) * k) / n; const zb = iz0 + ((iz1 - iz0) * (k + 1)) / n;
        beam([ix0, ya(za), za], [ix0, ya(zb), zb], 0.05, 0.05, vault); // placeholder kept tiny; the chord below is the surface
        const g = new THREE.BoxGeometry(ix1 - ix0, 0.05, Math.hypot(zb - za, ya(zb) - ya(za)) + 0.01);
        g.rotateX(-Math.atan2(ya(zb) - ya(za), zb - za)); g.translate((ix0 + ix1) / 2, (ya(za) + ya(zb)) / 2 + 0.025, (za + zb) / 2); kit.geo(vault, g);
        for (let x = ix0 + 2.2; x < ix1 - 1; x += 3.2) beam([x, ya(za) - 0.04, za], [x, ya(zb) - 0.04, zb], 0.18, 0.08, rib);
      }
      B(ix0, ix1, iz0, iz0 + 0.06, 3.0, 3.12, rib); B(ix0, ix1, iz1 - 0.06, iz1, 3.0, 3.12, rib);
      flat(ix0, ix1, iz0, iz0 + 0.12, PV + 0.004, po('c:#f4f2ec')); flat(ix0, ix1, iz1 - 0.12, iz1, PV + 0.004, po('c:#f4f2ec'));
      for (const x of [ix0 + (ix1 - ix0) / 3, ix0 + (2 * (ix1 - ix0)) / 3]) kit.fan(x, (iz0 + iz1) / 2, ya((iz0 + iz1) / 2));
      for (const x of [ix0 + 2.5, ix1 - 2.5]) for (const z of [iz0 + 0.35, iz1 - 0.35]) kit.tubeLight(x, z, 3.0, [1, 0]);
      fit({ ix0, ix1, iz0, iz1, y: PV });
    });
  };
  const gymFit = ({ ix0, ix1, iz0, iz1, y }) => {
    B(ix0, ix0 + 0.02, iz0 + 0.5, iz1 - 0.5, y + 0.3, y + 2.4, K.mirror);
    B(ix1 - 0.02, ix1, iz0, iz1, y, 3.1, K.orangeWall);
    S(ix0 + 0.3, ix0 + 0.8, iz0 + 1, iz1 - 1, y, y + 0.9, 'c:#3a3f44'); // dumbbell rack
    for (let z = iz0 + 1.3; z < iz1 - 1.2; z += 0.45) { kit.cyl(ix0 + 0.55, z, y + 0.9, 0.09, 0.08, K.black, { seg: 8 }); }
    for (const [x, z] of [[ix0 + 4, iz0 + 1.8], [ix0 + 7.5, iz0 + 1.8], [ix0 + 4, iz1 - 1.8]]) { // benches with barbells
      S(x - 0.9, x + 0.9, z - 0.18, z + 0.18, y, y + 0.45, 'c:#1f1f1f');
      kit.cyl(x, z, y + 1.0, 0.012, 0.0, K.steel);
      beam([x, y + 1.05, z - 0.9], [x, y + 1.05, z + 0.9], 0.04, 0.04, K.steel);
      for (const s of [-1, 1]) { const p = new THREE.CylinderGeometry(0.22, 0.22, 0.06, 14); p.rotateX(Math.PI / 2); p.translate(x, y + 1.05, z + s * 0.75); kit.geo(K.black, p); }
      for (const s of [-1, 1]) B(x - 0.05, x + 0.05, z + s * 0.5 - 0.03, z + s * 0.5 + 0.03, y, y + 1.05, K.steel);
    }
    for (const x of [ix1 - 2.2, ix1 - 4.4]) { S(x - 0.5, x + 0.5, iz1 - 1.6, iz1 - 0.3, y, y + 2.1, 'c:#4a4f55'); B(x - 0.4, x + 0.4, iz1 - 1.5, iz1 - 1.3, y + 0.4, y + 0.5, 'c:#1f1f1f'); }
    kit.interact('cooler', ix1 - 0.6, iz0 + 0.8, 'Drink from the water cooler', { y: y + 1.0 });
    S(ix1 - 0.8, ix1 - 0.3, iz0 + 0.5, iz0 + 1.0, y, y + 1.3, 'c:#e9edf0');
  };
  const gym2Fit = ({ ix0, ix1, iz0, iz1, y }) => {
    B(ix1 - 0.02, ix1, iz0, iz1, y, 3.1, K.orangeWall);
    B(ix0, ix0 + 0.02, iz0 + 0.5, iz1 - 0.5, y + 0.3, y + 2.4, K.mirror);
    for (let i = 0; i < 4; i++) { // treadmills facing the mirror
      const x = ix0 + 2.2 + i * 2.2; const z = iz0 + 1.4;
      S(x - 0.4, x + 0.4, z - 0.9, z + 0.9, y, y + 0.22, 'c:#2b2e31'); flat(x - 0.3, x + 0.3, z - 0.8, z + 0.6, y + 0.225, K.black);
      for (const s of [-1, 1]) B(x + s * 0.38, x + s * 0.42, z - 0.9, z - 0.85, y + 0.22, y + 1.3, K.steel);
      B(x - 0.4, x + 0.4, z - 1.0, z - 0.8, y + 1.2, y + 1.45, 'c:#3a3f44');
    }
    for (let i = 0; i < 2; i++) { const x = ix0 + 3 + i * 3; const z = iz1 - 1.6; S(x - 0.3, x + 0.3, z - 0.8, z + 0.8, y, y + 0.35, 'c:#2b2e31'); beam([x, y + 0.35, z - 0.6], [x, y + 1.6, z - 0.75], 0.08, 0.08, K.steel); }
  };
  const snookerFit = ({ ix0, ix1, iz0, iz1, y }) => {
    const table = (cx, cz, w, d) => {
      S(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, y + 0.62, y + 0.86, 't:wood:#5a3518');
      flat(cx - w / 2 + 0.12, cx + w / 2 - 0.12, cz - d / 2 + 0.12, cz + d / 2 - 0.12, y + 0.861, 'c:#1f7a3c');
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(cx + a * (w / 2 - 0.25) - 0.08, cx + a * (w / 2 - 0.25) + 0.08, cz + b * (d / 2 - 0.2) - 0.08, cz + b * (d / 2 - 0.2) + 0.08, y, y + 0.62, 't:wood:#5a3518');
      B(cx - w / 2 + 0.3, cx + w / 2 - 0.3, cz - 0.2, cz + 0.2, 2.6, 2.75, 'c:#1f1f1f'); B(cx - w / 2 + 0.35, cx + w / 2 - 0.35, cz - 0.15, cz + 0.15, 2.58, 2.6, K.lamp);
      for (const s of [-1, 1]) beam([cx + s * (w / 2 - 0.5), 2.75, cz], [cx + s * (w / 2 - 0.5), 3.5, cz], 0.02, 0.02, K.steel);
    };
    table(ix0 + 3.6, (iz0 + iz1) / 2, 3.57, 1.78); table(ix1 - 3.2, (iz0 + iz1) / 2, 2.5, 1.3);
    B(ix0, ix0 + 0.08, iz0 + 2, iz0 + 3.2, y + 0.8, y + 2.0, 't:wood:#5a3518'); // cue rack
    for (let i = 0; i < 8; i++) beam([ix0 + 0.1, y + 0.82, iz0 + 2.1 + i * 0.14], [ix0 + 0.1, y + 1.95, iz0 + 2.1 + i * 0.14], 0.02, 0.02, 't:wood:#c9a06a');
    S(ix0 + 1, ix0 + 4, iz1 - 0.6, iz1 - 0.2, y, y + 0.45, K.woodLt);
  };
  const danceFit = ({ ix0, ix1, iz0, iz1, y }) => {
    flat(ix0, ix1, iz0, iz1, y + 0.006, po('t:wood:#c49a6c'));
    B(ix0, ix0 + 0.02, iz0 + 0.4, iz1 - 0.4, y + 0.2, y + 2.6, K.mirror);
    for (const z of [iz1 - 0.6, iz1 - 1.6]) S(ix1 - 0.6, ix1 - 0.05, z - 0.45, z + 0.45, y, y + 1.9, 'c:#8c949a'); // steel almirahs
    B(ix1 - 0.3, ix1 - 0.02, iz0 + 0.6, iz0 + 1.0, 2.2, 2.8, K.black); // wall speaker
  };
  const classicalFit = ({ ix0, ix1, iz0, iz1, y }) => {
    for (let i = 0; i < 4; i++) flat(ix0 + 1 + i * 2.6, ix0 + 3 + i * 2.6, iz0 + 1.2, iz1 - 1.2, y + 0.008, po(i % 2 ? 'c:#a63d40' : 'c:#d8b04a')); // floor mats
    for (const [x, z] of [[ix0 + 3, (iz0 + iz1) / 2], [ix0 + 7, (iz0 + iz1) / 2 + 0.8]]) {
      kit.cyl(x, z, y, 0.13, 0.28, 't:wood:#7b4a26', { seg: 12 }); kit.cyl(x + 0.35, z, y, 0.16, 0.24, K.steel, { seg: 12 }); // tabla pair
    }
    { const x = ix1 - 3; const z = (iz0 + iz1) / 2; const s = new THREE.SphereGeometry(0.25, 12, 10); s.translate(x, y + 0.25, z); kit.geo('t:wood:#9a5b2a', s); beam([x, y + 0.3, z], [x + 1.1, y + 0.75, z], 0.08, 0.05, 't:wood:#6a3a1a'); } // sitar
    for (let i = 0; i < 6; i++) { const c = new THREE.CylinderGeometry(0.28, 0.3, 0.12, 12); c.translate(ix0 + 1.5 + i * 1.6, y + 0.06, iz1 - 0.7); kit.geo(K.cushion, c); }
  };
  const gurukulFit = ({ ix0, ix1, iz0, iz1, y }) => {
    const cx = ix0 + 3.5; const cz = (iz0 + iz1) / 2; // drum kit
    kit.cyl(cx, cz, y, 0.3, 0.45, 'c:#a01c1c', { seg: 14 }); kit.cyl(cx + 0.6, cz - 0.4, y + 0.5, 0.18, 0.2, 'c:#a01c1c', { seg: 12 }); kit.cyl(cx + 0.6, cz + 0.4, y + 0.5, 0.18, 0.2, 'c:#a01c1c', { seg: 12 });
    kit.cyl(cx - 0.4, cz + 0.7, y + 1.0, 0.25, 0.02, 'c:#c9a13a', { seg: 14 }); kit.cyl(cx - 0.4, cz + 0.7, y, 0.015, 1.0, K.steel, { seg: 6 });
    kit.cyl(cx - 0.4, cz - 0.7, y + 1.1, 0.22, 0.02, 'c:#c9a13a', { seg: 14 }); kit.cyl(cx - 0.4, cz - 0.7, y, 0.015, 1.1, K.steel, { seg: 6 });
    for (const [x, z] of [[ix1 - 1, iz0 + 0.7], [ix1 - 2.2, iz0 + 0.7]]) { S(x - 0.35, x + 0.35, z - 0.25, z + 0.25, y, y + 0.8, K.black); B(x - 0.3, x + 0.3, z + 0.25, z + 0.26, y + 0.1, y + 0.7, 'c:#3a3a3a'); }
    sign('dhwani', ix1 - 0.01, (iz0 + iz1) / 2, y + 1.6, 1.6, 0.5, [-1, 0]);
    kit.shelf(ix0 + 7, iz1 - 0.3, y, [0, -1], { w: 2.4, h: 1.8 });
  };
  // NW cluster: two columns either side of a north-south corridor, three rows
  const NWR = [[253, 260.5], [262, 269.5], [271, 278.5]]; const SWR = [[331, 338.5], [340, 347.5], [349, 356.5]];
  const NWfits = { '0,2': ['gym', gymFit, 'Health Club · Gym'], '0,1': ['gym2', gym2Fit, 'Gym 2'], '1,2': ['snooker', snookerFit, 'Snooker'] };
  const SWfits = { '0,0': ['dance', danceFit, 'Dance Club'], '1,0': ['classical', classicalFit, 'Classical Music & Dance'], '0,1': ['gurukul', gurukulFit, 'Music Room · Gurukul'] };
  for (const [cols, rows, fits, layer, cx] of [[[[-205, -191], [-187, -173]], NWR, NWfits, 'clubsN', [-191, -187]], [[[-194, -180], [-176, -162]], SWR, SWfits, 'clubsS', [-180, -176]]]) {
    cols.forEach(([x0, x1], c) => rows.forEach(([z0, z1], r) => {
      const f = fits[`${c},${r}`];
      const doorX = c === 0 ? cx[0] : cx[1];
      pavilion({ x0, x1, z0, z1, doorX, sign: f ? f[0] : 'club', layer: f ? layer : null, fit: f ? f[1] : null, wall: f && /dance|classical/.test(f[0]) ? K.lavender : K.cream, rib: f && /dance|classical/.test(f[0]) ? K.lavDark : K.orange, vault: f && f[0] === 'dance' ? 'c:#9d9ad6' : K.creamC });
      if (f) kit.room(f[0], f[2], x0 + 0.25, x1 - 0.25, z0 + 0.25, z1 - 0.25, PV, 3.8);
    }));
    // piers between the rows along the corridor
    for (let i = 0; i < rows.length - 1; i++) for (const x of cx) S(x - 0.18 + (x === cx[0] ? 0.18 : -0.18), x + 0.18 + (x === cx[0] ? 0.18 : -0.18), rows[i][1], rows[i + 1][0], CF, 3.2, K.granite);
  }

  // =====================================================================================================
  // KIOSKS: TOTT terrace (NE) and the SE cluster with Jawed Habib Salon; Looters and its food court
  // =====================================================================================================
  // 6 × 6 kiosk with a pyramid roof; the counter opens towards `face` ('n', 's', 'e', 'w'); y0: what it stands on
  const kiosk = (cx, cz, face, sg, y0, { door = false, label = null } = {}) => {
    const h = 3.0; const t = 0.25; const x0 = cx - 3; const x1 = cx + 3; const z0 = cz - 3; const z1 = cz + 3;
    for (const side of ['n', 's', 'w', 'e']) {
      const horiz = side === 'n' || side === 's';
      const c = side === 'n' ? z0 + t / 2 : side === 's' ? z1 - t / 2 : side === 'w' ? x0 + t / 2 : x1 - t / 2;
      const a0 = horiz ? x0 : z0 + t; const a1 = horiz ? x1 : z1 - t;
      const ops = side === face ? [door ? { at: (a1 - a0) / 2, width: 1.4, bottom: 0, top: 2.3 } : { at: (a1 - a0) / 2, width: 3.2, bottom: 1.0, top: 2.3 }] : [];
      if (horiz) W(a0, c, a1, c, y0, y0 + h, 't:plaster:#f1f0ea', { thick: t, openings: ops });
      else W(c, a0, c, a1, y0, y0 + h, 't:plaster:#f1f0ea', { thick: t, openings: ops });
      if (side === face) {
        const out = side === 'n' || side === 'w' ? -1 : 1; const mid = (a0 + a1) / 2;
        const R = (p0, p1, q0, q1, ya, yb, k) => (horiz ? B(p0, p1, q0, q1, ya, yb, k) : B(q0, q1, p0, p1, ya, yb, k));
        if (door) { R(mid - 0.7, mid + 0.7, c - 0.02, c + 0.02, y0, y0 + 2.3, K.glazed); kit.col(...(horiz ? [mid - 0.7, mid + 0.7, c - 0.1, c + 0.1] : [c - 0.1, c + 0.1, mid - 0.7, mid + 0.7]), y0, y0 + 2.3); }
        else R(mid - 1.7, mid + 1.7, c - t / 2 - 0.05, c + out * (t / 2 + 0.25), y0 + 0.96, y0 + 1.04, 'c:#e0dcd2');
        R(mid - 2.0, mid + 2.0, c + out * (t / 2), c + out * (t / 2 + 0.9), y0 + 2.45, y0 + 2.55, K.white); // sunshade
        if (sg) sign(sg, horiz ? mid : c + out * (t / 2), horiz ? c + out * (t / 2) : mid, y0 + 2.58, 3.6, 0.42, horiz ? [0, out] : [out, 0]);
      }
    }
    B(x0 - 0.03, x1 + 0.03, z0 - 0.03, z1 + 0.03, y0, y0 + 0.5, K.plinth);
    hip(x0 - 0.35, x1 + 0.35, z0 - 0.35, z1 + 0.35, y0 + h, 1.8, K.kioskRoof);
    L(cz < 300 ? 'kiosksN' : 'kiosksS', () => { // inside: a dark back room, a shelf of stock and a light
      B(x0 + t, x1 - t, z0 + t, z1 - t, y0 + 2.9, y0 + 3.0, 'c:#5c5f63');
      flat(x0 + t, x1 - t, z0 + t, z1 - t, y0 + 0.01, 'c:#6a6d70');
      kit.tubeLight(cx, cz, y0 + 2.9, [1, 0]);
      const back = { n: [cx, z1 - t - 0.25, [0, -1]], s: [cx, z0 + t + 0.25, [0, 1]], w: [x1 - t - 0.25, cz, [-1, 0]], e: [x0 + t + 0.25, cz, [1, 0]] }[face];
      kit.shelf(back[0], back[1], y0, back[2], { w: 3.0, h: 2.0, books: ['c:#e85d2a', 'c:#f2c14e', 'c:#3d7ea6', 'c:#7fb069', 'c:#c0392b'] });
    });
    const out = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] }[face];
    if (!door) kit.interact('vending', cx + out[0] * 3.9, cz + out[1] * 3.9, label || 'Buy a snack', { y: y0 + 1.2, radius: 1.8 });
  };
  // the TOTT terrace: raised paving with grey parapets, steps, long tables with red plastic chairs
  {
    const T = { x0: -169, x1: -132, z0: 242, z1: 266 };
    FL(T.x0, T.x1, T.z0, T.z1, 0, P, 't:paving:#cfc8bb');
    const par = (u0, u1, v0, v1) => { S(u0, u1, v0, v1, 0, P + 0.6, 't:plaster:#a9adae'); B(u0 - 0.03, u1 + 0.03, v0 - 0.03, v1 + 0.03, P + 0.6, P + 0.66, K.white); };
    par(T.x0, T.x1, T.z0, T.z0 + 0.25);
    par(T.x0, T.x0 + 0.25, T.z0, 252.5); par(T.x0, T.x0 + 0.25, 255.5, T.z1);
    par(T.x1 - 0.25, T.x1, T.z0, 252); par(T.x1 - 0.25, T.x1, 262, T.z1);
    par(T.x0, -157, T.z1 - 0.25, T.z1); par(-151, -143, T.z1 - 0.25, T.z1); par(-139, T.x1, T.z1 - 0.25, T.z1);
    for (const [x, w] of [[-154, 6], [-141, 4]]) kit.flight(x, T.z1 + 1.2, 0, [0, -1], 3, P / 3, w, K.step, { tread: 0.4 });
    kit.flight(T.x0 - 1.2, 254, 0, [1, 0], 3, P / 3, 3, K.step, { tread: 0.4 });
    for (const [x0, label] of [[-169.0, null], [-162.0, 'shop2'], [-155.0, 'tott'], [-148.0, 'shop1']]) kiosk(x0 + 3.0 + 0.25, 245.6, 's', label, P, { label: label === 'tott' ? 'Order at TOTT' : 'Buy a snack' });
    kiosk(-135.4, 257, 'w', 'f301', P, { label: 'Get an ice cream at -301°F' });
    for (const z of [251.5, 255, 258.5, 262]) for (const x0 of [-166, -159.5, -153]) {
      S(x0, x0 + 4.4, z - 0.4, z + 0.4, P, P + 0.75, K.table);
      for (let k = 0; k < 4; k++) for (const s of [-1, 1]) kit.chair(x0 + 0.6 + k * 1.05, z + s * 0.75, P, [0, -s], { seat: K.chairRed, frame: K.chairRed });
    }
    for (const [x, z] of [[-167.5, 264.5], [-133.5, 243.5]]) { kit.cyl(x, z, P, 0.07, 6.5, K.pole, { seg: 8 }); beam([x, P + 6.4, z], [x + 1.2, P + 6.4, z], 0.07, 0.07, K.pole); B(x + 1.0, x + 1.5, z - 0.15, z + 0.15, P + 6.2, P + 6.35, K.lamp); }
  }
  // SE cluster: three kiosks facing south and two facing north across a paved court; Jawed Habib Salon at the east end
  kiosk(-148, 336.5, 's', 'shop3', 0); kiosk(-140, 336.5, 's', 'shop2', 0); kiosk(-132, 336.5, 's', 'shop1', 0);
  kiosk(-146, 351.5, 'n', 'club', 0, { door: true }); kiosk(-131, 351.0, 'n', 'jh', 0, { door: true });
  // Looters: the OSM stall (black shed, neon sign, tent canopy, counter) and its food court
  {
    const lo = ctx.buildings[1].outer;
    const sh = new THREE.Shape(lo.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 3.6, bevelEnabled: false }); g.rotateX(-Math.PI / 2); kit.geo('c:#1b1c1e', g);
    const xs = lo.map((p) => p[0]); const zs = lo.map((p) => p[1]);
    kit.col(Math.min(...xs) + 0.4, Math.max(...xs) - 0.4, Math.min(...zs) + 0.2, Math.max(...zs) - 0.2, 0, 3.6);
    // east face: from lo[2] to lo[3] (the edge facing the food court)
    const [ax, az] = lo[2]; const [bx, bz] = lo[3]; const ex = bx - ax; const ez = bz - az; const el = Math.hypot(ex, ez);
    const nx = ez / el; const nz = -ex / el; const mx = (ax + bx) / 2; const mz = (az + bz) / 2;
    const face = nx > 0 ? [nx, nz] : [-nx, -nz];
    const i = SROW.looters; const N = SIGNS.length;
    vplane(mx + face[0] * 0.02, mz + face[1] * 0.02, 2.5, 5.0, 0.8, face, K.neon, { uv: [0, 1 - (i + 1) / N, 1, 1 - i / N], offset: 0.02 });
    B(mx + face[0] * 0.3 - 0.3, mx + face[0] * 0.3 + 0.3, mz - 3.2, mz + 3.2, 0, 1.0, 'c:#2a2b2d', { collide: true }); // counter
    B(mx + face[0] * 0.3 - 0.35, mx + face[0] * 0.3 + 0.35, mz - 3.25, mz + 3.25, 1.0, 1.05, K.steel);
    // tent canopy over the counter: a sloping white sheet on steel poles
    const c0 = mx + face[0] * 0.1; const c1 = mx + face[0] * 3.6;
    { const len = Math.hypot(c1 - c0, 0.8); const g2 = new THREE.BoxGeometry(len, 0.04, 8.4); g2.rotateZ(-Math.atan2(0.8, c1 - c0)); g2.translate((c0 + c1) / 2, 3.2, mz); kit.geo(K.canopy, g2); }
    for (const z of [mz - 4.0, mz, mz + 4.0]) kit.cyl(c1 - 0.1, z, 0, 0.04, 2.8, K.steel, { seg: 6, collide: true });
    kit.interact('vending', mx + face[0] * 1.6, mz, 'Order at Looters', { y: 1.2, radius: 2.2 });
    // the food court: paved, round tables, flowerbeds and white tubular railings
    flat(-179, -169, 226, 252, 0.03, po(K.paving));
    for (const [x, z] of [[-175.5, 230], [-172, 234], [-175.5, 239], [-172, 243.5], [-175.5, 248]]) {
      kit.cyl(x, z, 0, 0.06, 0.74, K.steel, { seg: 6, collide: true }); kit.cyl(x, z, 0.74, 0.6, 0.03, K.table, { seg: 18 });
      for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 2 + 0.4; kit.chair(x + Math.cos(a) * 0.9, z + Math.sin(a) * 0.9, 0, [-Math.cos(a), -Math.sin(a)], { seat: K.chairRed, frame: K.chairRed }); }
    }
    for (const z of [227, 236]) { S(-178.8, -177.8, z, z + 6, 0, 0.45, 't:plaster:#a9adae'); for (let k = 0; k < 5; k++) { const sp = new THREE.SphereGeometry(0.35, 8, 6); sp.translate(-178.3, 0.6, z + 0.6 + k * 1.2); kit.geo(k % 2 ? 'c:#c2385a' : K.hedge, sp); } }
    for (const z0 of [226, 233]) { kit.rail(-169.1, z0, -169.1, z0 + 6, 0, K.pole, { h: 0.9 }); }
    kit.cyl(-170, 240, 0, 0.07, 6.5, K.pole, { seg: 8 }); beam([-170, 6.4, 240], [-171.2, 6.4, 240], 0.07, 0.07, K.pole); B(-171.5, -171.0, 239.85, 240.15, 6.2, 6.35, K.lamp);
    // the dark dining shed west of the food court: open sides, steel columns, low dark roof, tables
    const DS = { x0: -205, x1: -180, z0: 241, z1: 251 };
    flat(DS.x0, DS.x1, DS.z0, DS.z1, 0.03, po('t:concrete:#a7a9a6'));
    B(DS.x0 - 0.3, DS.x1 + 0.3, DS.z0 - 0.3, DS.z1 + 0.3, 3.6, 3.8, K.darkRoof);
    B(DS.x0 - 0.35, DS.x1 + 0.35, DS.z0 - 0.35, DS.z1 + 0.35, 3.45, 3.6, 'c:#2a2d31');
    for (let x = DS.x0 + 0.2; x <= DS.x1; x += 4.9) for (const z of [DS.z0 + 0.2, DS.z1 - 0.2]) kit.cyl(x, z, 0, 0.1, 3.45, 'c:#2a2d31', { seg: 8, collide: true });
    L('looters', () => {
      for (let x = DS.x0 + 2.5; x < DS.x1 - 2; x += 4.9) {
        S(x - 1.2, x + 1.2, 245.6, 246.4, 0, 0.75, K.table);
        for (let k = 0; k < 3; k++) for (const s of [-1, 1]) kit.chair(x - 0.8 + k * 0.8, 246 + s * 0.75, 0, [0, -s], { seat: K.chairRed, frame: K.chairRed });
      }
      for (let x = DS.x0 + 4; x < DS.x1; x += 6) kit.tubeLight(x, 246, 3.45, [1, 0]);
    });
  }

  // =====================================================================================================
  // the rest of the campus: grass, trees, labels, rooms, entrances, floors
  // =====================================================================================================
  // The two OSM grass polygons belong to this complex and ran under the halls (research A, H); the lawns above
  // replace them. buildAreas runs after the modules.
  const mine = (a) => a.kind === 'grass' && a.poly.every(([x, z]) => x > -185 && x < -140 && z > 270 && z < 330);
  if (D?.areas) D.areas.splice(0, D.areas.length, ...D.areas.filter((a) => !mine(a)));
  // keep the scattered campus trees out of the halls, pavilions, corridors and courts (buildTrees skips anything
  // within 9 m of these points); the lawns and the road avenue keep theirs
  campus.statuePts ||= [];
  for (let x = -204; x <= -126; x += 9) for (let z = 230; z <= 358; z += 9) {
    const lawn = x > -166 && x < -147 && ((z > 285 && z < 288) || (z > 320 && z < 324));
    if (!lawn) campus.statuePts.push([x, z]);
  }
  kit.label('SAC · Indoor sports halls', (WB.x0 + WB.x1) / 2, (WB.z0 + WB.z1) / 2, 13.5, { height: 0.6 });
  kit.label('SAC · Club rooms', -189, 265, 7, { height: 0.5 });
  kit.label('SAC · Club rooms', -178, 343, 7, { height: 0.5 });
  kit.label('TOTT terrace', -152, 254, 5.5, { height: 0.5 });

  kit.room('hall', 'SAC inside (east hall)', EH.x0, EH.x1, EH.z0, EH.z1, P, EH.crown);
  kit.room('lobby', 'Lobby', LB.x0, LB.x1, LB.z0, LB.z1, P, 4.8);
  kit.room('portico', 'Portico', PO.x0, PO.x1, PO.op0, PO.op1, P, PO.open);
  kit.floors.push({ y: 0, name: 'Grade (lawns, forecourt, auditorium)' }, { y: P, name: 'Hall plinth' }, { y: M, name: 'Martial Arts mezzanine' });
  kit.entrance('Main entrance (portico)', PO.x1 + 6, AXIS, [1, 0]);
  kit.entrance('North arcade (north lawn)', -156, EH.z0 - 2, [0, -1]);
  kit.entrance('South arcade (south lawn)', -156, EH.z1 + 2, [0, 1]);
  kit.entrance('Sports halls (north door)', -186, WB.z0 - 1.6, [0, -1]);
  kit.entrance('Table tennis hall (south door)', -186, WB.z1 + 1.6, [0, 1]);
  kit.entrance('NW club pavilions', -189, 281, [0, 1]);
  kit.entrance('SW club pavilions', -178, 328, [0, -1]);
  kit.entrance('TOTT terrace steps', -154, 267.5, [0, 1]);
  // NPCs: from the room's exit straight out through the lobby and portico to the road
  kit.navLinks.push([[room.exit.x, room.exit.z], [PO.x1 + 7, AXIS]]);
}
