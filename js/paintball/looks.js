// Character customisation choices for the paintball match, shared by the server (which validates them) and the
// browser (which builds the NPC model from them). Plain data.
export const CHARACTERS = [
  { name: 'Spiky', gender: 'm', hair: 'spiky', skinIndex: 0, height: 1.74 },
  { name: 'Ponytail', gender: 'f', hair: 'ponytail', skinIndex: 2, height: 1.64 },
  { name: 'Classic', gender: 'm', hair: 'short', skinIndex: 3, height: 1.78 },
  { name: 'Long hair', gender: 'f', hair: 'long', skinIndex: 1, height: 1.62 },
  { name: 'Turban', gender: 'm', hair: 'turban', skinIndex: 4, height: 1.8 },
  { name: 'Bun', gender: 'f', hair: 'bun', skinIndex: 5, height: 1.66 },
];
export const OUTFIT_COLOURS = ['#30d5ff', '#ff3d7f', '#ffd23d', '#7cff4f', '#b26bff', '#ff8a1f', '#f5f6fa', '#2d3436'];
export const PANTS_COLOURS = ['#2d3436', '#24345a', '#3b5a86', '#636e72', '#1f2a52', '#6c3a1f'];
export const MASK_COLOURS = ['#ff3d7f', '#30d5ff', '#ffd23d', '#7cff4f', '#b26bff', '#ff8a1f', '#f5f6fa', '#1e272e'];
export const ACCESSORIES = [
  { id: 'none', name: 'None' },
  { id: 'cap', name: 'Cap' },
  { id: 'headband', name: 'Headband' },
  { id: 'scarf', name: 'Scarf' },
  { id: 'backpack', name: 'Mini backpack' },
];
const HEX = /^#[0-9a-f]{6}$/i;
// Keep only valid choices; anything else falls back to the current value.
export function cleanLook(o = {}, cur = {}) {
  const ch = Number.isInteger(o.character) && o.character >= 0 && o.character < CHARACTERS.length ? o.character : cur.character ?? 0;
  const col = (v, list, d) => (typeof v === 'string' && HEX.test(v) && list.includes(v.toLowerCase()) ? v.toLowerCase() : d);
  return {
    character: ch,
    outfit: col(o.outfit, OUTFIT_COLOURS, cur.outfit ?? OUTFIT_COLOURS[0]),
    pants: col(o.pants, PANTS_COLOURS, cur.pants ?? PANTS_COLOURS[0]),
    mask: col(o.mask, MASK_COLOURS, cur.mask ?? MASK_COLOURS[0]),
    accessory: ACCESSORIES.some((a) => a.id === o.accessory) ? o.accessory : cur.accessory ?? 'none',
  };
}
