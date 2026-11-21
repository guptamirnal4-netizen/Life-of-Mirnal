// Paintball equipment: the six blaster categories, shared by the game server (server/) and the browser.
// Plain data, no three.js or DOM, so Node can import it. Every number here is a tuning knob.
//
//   tag        paint added to the target per paintball hit (a player is tagged at PAINT_MAX)
//   range      metres a paintball flies before it drops out
//   rate       paintballs (or bursts) per second
//   speed      paintball speed, m/s
//   pellets    paintballs per trigger pull (the spread blaster fires a fan)
//   spread     random cone half-angle, radians
//   burst      shots per trigger pull fired `burstGap` s apart (burst marker)
//   reload     seconds to refill the hopper
//   magazine   paintballs in the hopper
//   total      paintballs carried at spawn, hopper included
//   cooldown   seconds after switching to this blaster before it can fire
//   splash     radius of the paint splash (splash launcher): everyone inside gets `tag` scaled by distance
//   gravity    drop, m/s² (lobbed launcher shells arc)
//   precision  multiplier for a precision paint hit (a hit on the head)
export const PAINT_MAX = 100;

export const EQUIPMENT = [
  { id: 'standard', name: 'Standard Paintball Blaster', short: 'Standard', key: '1', tag: 34, range: 45, rate: 4, speed: 70, pellets: 1, spread: 0.012, burst: 1, burstGap: 0, reload: 1.6, magazine: 20, total: 120, cooldown: 0.35, splash: 0, gravity: 4, precision: 1.5, colour: '#ff3d7f', fx: 'blob' },
  { id: 'rapid', name: 'Rapid-Fire Foam Blaster', short: 'Rapid', key: '2', tag: 14, range: 32, rate: 11, speed: 60, pellets: 1, spread: 0.04, burst: 1, burstGap: 0, reload: 2.2, magazine: 45, total: 225, cooldown: 0.45, splash: 0, gravity: 6, precision: 1.3, colour: '#30d5ff', fx: 'foam' },
  { id: 'burst', name: 'Burst-Fire Paintball Marker', short: 'Burst', key: '3', tag: 22, range: 42, rate: 2.2, speed: 75, pellets: 1, spread: 0.018, burst: 3, burstGap: 0.07, reload: 1.9, magazine: 24, total: 144, cooldown: 0.4, splash: 0, gravity: 4, precision: 1.5, colour: '#ffd23d', fx: 'blob' },
  { id: 'spread', name: 'Paintball Spread Blaster', short: 'Spread', key: '4', tag: 12, range: 18, rate: 1.3, speed: 55, pellets: 7, spread: 0.11, burst: 1, burstGap: 0, reload: 2.4, magazine: 8, total: 48, cooldown: 0.5, splash: 0, gravity: 8, precision: 1.2, colour: '#7cff4f', fx: 'confetti' },
  { id: 'precision', name: 'Precision Paint Marker', short: 'Precision', key: '5', tag: 60, range: 90, rate: 0.9, speed: 120, pellets: 1, spread: 0.002, burst: 1, burstGap: 0, reload: 2.6, magazine: 5, total: 35, cooldown: 0.8, splash: 0, gravity: 1.5, precision: 1.7, colour: '#b26bff', fx: 'streak', zoom: 2.4 },
  { id: 'launcher', name: 'Paint Splash Launcher', short: 'Launcher', key: '6', tag: 70, range: 35, rate: 0.6, speed: 24, pellets: 1, spread: 0.01, burst: 1, burstGap: 0, reload: 3.0, magazine: 3, total: 12, cooldown: 0.9, splash: 4, gravity: 12, precision: 1, colour: '#ff8a1f', fx: 'splash' },
];
export const EQUIPMENT_BY_ID = Object.fromEntries(EQUIPMENT.map((e) => [e.id, e]));
// Each player carries a primary and a secondary choice from the six (switch with 1–6 / Q / mouse wheel).
export const LOADOUT_SIZE = 2;
export const DEFAULT_LOADOUT = ['standard', 'rapid'];
