// Campus Royale supplies: everything a player can pick up, carry, drop, throw or use. Shared by the game server
// (which owns every inventory and validates every pick-up) and the browser (labels, HUD, crate colours).
// Plain data and pure functions, no DOM.
//
// Inventory:
//   paintball blasters   2 slots (primary, secondary). Picking up a third swaps it with the one in your hands
//                        (that one drops where you stand). Each comes with a full hopper.
//   paintballs           per blaster type, up to that blaster's carry limit (equipment.js `total`)
//   paint bombs          up to 4 (G throws one: an arc, bounces, a ~2 s fuse, a paint splash with falloff)
//   colour-smoke bombs   up to 2 (visual cover only: a coloured cloud for 12 s)
//   cleaning wipes       up to 5 (H: −25 paint over 2.5 s)    cleaning kits up to 2 (H: −65 paint over 6 s)
//   protective gear      one mask and one padded vest, tiers 1–3; a better one replaces yours (the old one drops)
//   paint refill pack    universal: half a carry of paintballs for the blaster in your hands (any type)
//   paint shield         up to 1 (C: a bubble for 4 s that no paint gets through; you cannot fire from inside it)
//   paint-scan pulse     up to 2 (Z: shows opponents within 60 m on your minimap for 6 s)
//
// Supplies sit in crates at verified supply spots (js/paintball/data/royale-spots.json): walk up, E opens the crate
// (everyone sees it open), pick an item from the crate panel. The server owns the contents; each item has a unique
// uid so two players can never take the same one. Nothing respawns during a match; a new match rolls new crates.
// One special supply drop lands mid-match (ROYALE.airdrop) with better items.
import { EQUIPMENT, EQUIPMENT_BY_ID } from './equipment.js';

export const BLASTER_IDS = EQUIPMENT.map((e) => e.id);
// paintballs in one pack, per blaster type
export const PACK = { standard: 40, rapid: 90, burst: 48, spread: 16, precision: 10, launcher: 4 };
export const AMMO_MAX = Object.fromEntries(EQUIPMENT.map((e) => [e.id, e.total]));

// Protective gear: the share of paint it stops. The mask protects the head (precision paint hits), the vest the
// body (direct hits, splashes and paint bombs). Zone paint is never reduced.
export const GEAR = {
  mask: [0, 0.25, 0.4, 0.55],
  vest: [0, 0.15, 0.25, 0.35],
};
export const BOMB = { fuse: 2.0, speed: 15, loft: 0.22, gravity: 12, bounce: 0.45, friction: 0.7, radius: 5, paint: 70, min: 0.25, maxBounces: 6 };
export const SMOKE = { fuse: 1.6, radius: 6, duration: 12 };
export const KITS = { wipes: { paint: 25, time: 2.5, max: 5 }, kit: { paint: 65, time: 6, max: 2 } };
export const SHIELD = { time: 4 };
export const SCAN = { radius: 60, time: 6 };
export const CARRY = { paintbomb: 4, smoke: 2, wipes: KITS.wipes.max, kit: KITS.kit.max, shield: 1, scan: 2 };

// Every item kind. `kind` decides what picking it up does; `colour` tints its crate.
export const ITEMS = {};
for (const e of EQUIPMENT) {
  ITEMS[`blaster:${e.id}`] = { id: `blaster:${e.id}`, kind: 'blaster', blaster: e.id, name: e.short + ' blaster', long: e.name, colour: e.colour, icon: '🎯' };
  ITEMS[`ammo:${e.id}`] = { id: `ammo:${e.id}`, kind: 'ammo', blaster: e.id, name: `${e.short} paintballs`, long: `Paintball pack (${e.short}) ×${PACK[e.id]}`, colour: e.colour, icon: '🟣', n: PACK[e.id] };
}
Object.assign(ITEMS, {
  paintbomb: { id: 'paintbomb', kind: 'throw', name: 'Paint bomb', long: 'Paint bomb: throw with G, bursts after ~2 s', colour: '#ff3d7f', icon: '💣' },
  smoke: { id: 'smoke', kind: 'throw', name: 'Colour-smoke bomb', long: 'Colour-smoke bomb: a cloud to hide in', colour: '#b26bff', icon: '☁️' },
  wipes: { id: 'wipes', kind: 'kit', name: 'Cleaning wipes', long: 'Cleaning wipes: −25 paint (H, 2.5 s)', colour: '#7cff4f', icon: '🧻' },
  kit: { id: 'kit', kind: 'kit', name: 'Cleaning kit', long: 'Cleaning kit: −65 paint (H, 6 s)', colour: '#30d5ff', icon: '🧴' },
  refill: { id: 'refill', kind: 'refill', name: 'Paint refill pack', long: 'Paint refill pack: half a carry of paintballs for the blaster in your hands', colour: '#ffd23d', icon: '🎨' },
  shield: { id: 'shield', kind: 'gadget', name: 'Paint shield', long: `Paint shield: C, a bubble no paint gets through for ${SHIELD.time} s (no firing from inside)`, colour: '#7cf0ff', icon: '🛡️' },
  scan: { id: 'scan', kind: 'gadget', name: 'Paint-scan pulse', long: `Paint-scan pulse: Z, shows opponents within ${SCAN.radius} m on your minimap for ${SCAN.time} s`, colour: '#b26bff', icon: '📡' },
});
for (const t of [1, 2, 3]) {
  ITEMS[`mask${t}`] = { id: `mask${t}`, kind: 'gear', slot: 'mask', tier: t, name: `Mask L${t}`, long: `Paintball mask, level ${t}: stops ${Math.round(GEAR.mask[t] * 100)}% of head paint`, colour: ['', '#f5f6fa', '#30d5ff', '#ffd23d'][t], icon: '🥽' };
  ITEMS[`vest${t}`] = { id: `vest${t}`, kind: 'gear', slot: 'vest', tier: t, name: `Padded vest L${t}`, long: `Padded vest, level ${t}: stops ${Math.round(GEAR.vest[t] * 100)}% of body paint`, colour: ['', '#f5f6fa', '#30d5ff', '#ffd23d'][t], icon: '🦺' };
}

// Catalogue fields every item has (for the HUD, the crate panel and anyone reading the rules):
//   category, spawn (where it appears), qty (how many one pick-up gives), pickup (what picking it up does),
//   limit (how many you can carry), respawn (availability).
const CAT = { blaster: 'Paintball blaster', ammo: 'Paintballs', throw: 'Throwable', kit: 'Cleaning', gear: 'Protective gear', refill: 'Paintballs', gadget: 'Utility' };
for (const it of Object.values(ITEMS)) {
  it.category = CAT[it.kind];
  it.spawn = it.kind === 'gadget' || (it.kind === 'gear' && it.tier === 3) ? 'supply crates (rare) and the special supply drop' : 'supply crates at verified supply spots across campus; dropped piles';
  it.qty = it.kind === 'ammo' ? PACK[it.blaster] : 1;
  it.limit = it.kind === 'blaster' ? 2 : it.kind === 'ammo' ? AMMO_MAX[it.blaster] : it.kind === 'gear' ? 1 : it.kind === 'refill' ? null : CARRY[it.id];
  it.pickup = { blaster: 'fills an empty blaster slot, or swaps with the one in your hands', ammo: 'adds paintballs up to the carry limit; the rest stays in the crate', throw: 'adds to your throwables', kit: 'adds to your cleaning supplies', gear: 'replaces worse gear (the old one drops)', refill: 'used at once: paintballs for the blaster in your hands', gadget: 'adds to your utilities' }[it.kind];
  it.respawn = 'once per match: crates are rolled when the match starts and do not refill';
}

// What a supply spot holds, by weight.
export const LOOT_TABLE = [
  ['blaster', 20], ['ammo', 26], ['refill', 6], ['paintbomb', 11], ['smoke', 4], ['wipes', 11], ['kit', 5], ['gear', 13], ['shield', 2], ['scan', 2],
];
export const BLASTER_WEIGHTS = { standard: 24, rapid: 22, burst: 18, spread: 16, precision: 10, launcher: 10 };
const GEAR_TIERS = [[1, 55], [2, 33], [3, 12]];
const pickW = (rand, list) => { const tot = list.reduce((s, [, w]) => s + w, 0); let r = rand() * tot; for (const [k, w] of list) { r -= w; if (r < 0) return k; } return list[list.length - 1][0]; };
// One spot's items: [itemId, amount] (a blaster comes with a pack of its paintballs).
export function rollLoot(rand) {
  const k = pickW(rand, LOOT_TABLE);
  if (k === 'blaster') { const b = pickW(rand, Object.entries(BLASTER_WEIGHTS)); return [[`blaster:${b}`, 1], [`ammo:${b}`, PACK[b]]]; }
  if (k === 'ammo') { const b = pickW(rand, Object.entries(BLASTER_WEIGHTS)); return [[`ammo:${b}`, PACK[b]]]; }
  if (k === 'gear') return [[`${rand() < 0.5 ? 'mask' : 'vest'}${pickW(rand, GEAR_TIERS)}`, 1]];
  return [[k, 1]];
}
// A supply crate: two rolls (so 2–4 items).
export const rollCrate = (rand) => [...rollLoot(rand), ...rollLoot(rand)];
// The special supply drop: the good stuff.
export function rollAirdrop(rand) {
  const b = rand() < 0.5 ? 'precision' : 'launcher';
  return [[`blaster:${b}`, 1], [`ammo:${b}`, AMMO_MAX[b]], [rand() < 0.5 ? 'vest3' : 'mask3', 1], ['paintbomb', 2], ['shield', 1], ['kit', 1]];
}

// ---------- inventory ----------
// inv: { primary, secondary, slot, ammo: { [blaster]: n }, paintbomb, smoke, wipes, kit, gearMask, gearVest }
// Returns what picking up `n` of `itemId` does: { take (how many), drop: [[itemId, n]] (what falls out), reason }.
export function pickupPlan(inv, itemId, n = 1) {
  const it = ITEMS[itemId];
  if (!it) return { take: 0, drop: [], reason: 'unknown' };
  if (it.kind === 'blaster') {
    if (!inv.primary || !inv.secondary) return { take: 1, drop: [], slot: !inv.primary ? 0 : 1 };
    const inHand = inv.slot ? inv.secondary : inv.primary;
    return { take: 1, drop: [[`blaster:${inHand}`, 1]], slot: inv.slot, swap: true };
  }
  if (it.kind === 'ammo') {
    const room = AMMO_MAX[it.blaster] - (inv.ammo[it.blaster] || 0);
    if (room <= 0) return { take: 0, drop: [], reason: 'full' };
    return { take: Math.min(room, n), drop: [] };
  }
  if (it.kind === 'throw' || it.kind === 'kit') {
    const room = CARRY[itemId] - (inv[itemId] || 0);
    if (room <= 0) return { take: 0, drop: [], reason: 'full' };
    return { take: Math.min(room, n), drop: [] };
  }
  if (it.kind === 'refill') {
    const b = (inv.slot ? inv.secondary : inv.primary) || inv.primary || inv.secondary;
    if (!b) return { take: 0, drop: [], reason: 'no-blaster' };
    const room = AMMO_MAX[b] - (inv.ammo[b] || 0);
    if (room <= 0) return { take: 0, drop: [], reason: 'full' };
    return { take: 1, drop: [], blaster: b, add: Math.min(room, Math.ceil(AMMO_MAX[b] / 2)) };
  }
  if (it.kind === 'gadget') {
    const room = CARRY[itemId] - (inv[itemId] || 0);
    if (room <= 0) return { take: 0, drop: [], reason: 'full' };
    return { take: Math.min(room, n), drop: [] };
  }
  if (it.kind === 'gear') {
    const cur = it.slot === 'mask' ? inv.gearMask : inv.gearVest;
    if (cur >= it.tier) return { take: 0, drop: [], reason: 'have-better' };
    return { take: 1, drop: cur ? [[`${it.slot}${cur}`, 1]] : [] };
  }
  return { take: 0, drop: [], reason: 'unknown' };
}

// Paint after protective gear. head: a precision paint hit; zone paint is not reduced.
export function gearPaint(amount, { gearMask = 0, gearVest = 0 }, { head = false, zone = false } = {}) {
  if (zone) return amount;
  return amount * (1 - (head ? GEAR.mask[gearMask] || 0 : GEAR.vest[gearVest] || 0));
}

// Paint-bomb splash at distance d (from the burst to the body's surface): full at the centre, falling off to
// BOMB.min at the edge, nothing beyond.
export const bombPaint = (d) => (d > BOMB.radius ? 0 : BOMB.paint * Math.max(BOMB.min, 1 - d / BOMB.radius));

export const itemName = (id) => ITEMS[id]?.name || id;
export const isBlaster = (id) => !!EQUIPMENT_BY_ID[id];
