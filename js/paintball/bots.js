// Computer-controlled paintball players (bots): difficulty levels, names and limits. Shared by the game server
// (server/bots/, which runs them as ordinary players driven by an AI that sends the same inputs a browser sends)
// and the browser (the lobby, the portal's Play vs Bots sheet, badges). Plain data, no DOM.
export const BOT_BADGE = '🤖';

// Every number is a tuning knob. Angles in radians, times in seconds, distances in metres.
//   think      decisions per second (perception, target, goal)
//   reaction   delay [min, max] between first seeing an opponent and the first paintball
//   aim        aim error (standard deviation, rad) re-rolled per burst; drift: slow wander on top
//   turn       how fast the aim turns (rad/s)
//   lead       share of the target's movement the aim leads (0 = aims where they are)
//   range      share of the blaster's range the bot fires within
//   view, fov  how far and how wide it sees (line of sight is always checked against the walls)
//   hear       opponents this close are noticed outside the view cone (footsteps, paintballs)
//   memory     how long an opponent who went out of sight is chased / remembered
//   burst      trigger hold [min, max]; pause: gap between bursts [min, max]
//   cover      chance it breaks off to cover when painted or reloading; strafe: share of the time it strafes
//   bombs      chance it throws a paint bomb at someone behind cover or a group (Campus Royale)
//   shield     chance it raises a paint shield when painted heavily; clean: chance it cleans paint off when safe
//   loot       seconds between picking items from a crate; smart: takes only what improves its kit
//   airdrop    chance it races for the special supply drop; zone: seconds early it heads for the next circle
export const BOT_LEVELS = [
  { id: 'easy', name: 'Easy', blurb: 'Slow to react, sprays paint, rarely takes cover.', think: 5, reaction: [0.65, 1.05], aim: 0.085, drift: 0.05, turn: 3, lead: 0, range: 0.6, view: 50, fov: 1.9, hear: 6, memory: 1.5, burst: [0.5, 1.3], pause: [0.5, 1.0], cover: 0.15, strafe: 0.2, bombs: 0, shield: 0, clean: 0.4, loot: 1.1, smart: false, airdrop: 0.15, zone: 0 },
  { id: 'medium', name: 'Medium', blurb: 'Aims decently, strafes, uses cover and the odd paint bomb.', think: 7, reaction: [0.38, 0.6], aim: 0.04, drift: 0.025, turn: 5.5, lead: 0.6, range: 0.8, view: 70, fov: 2.1, hear: 10, memory: 3, burst: [0.35, 0.8], pause: [0.25, 0.55], cover: 0.55, strafe: 0.6, bombs: 0.5, shield: 0.6, clean: 0.8, loot: 0.6, smart: true, airdrop: 0.4, zone: 20 },
  { id: 'hard', name: 'Hard', blurb: 'Quick, accurate, reloads in cover, throws paint bombs, races the zone.', think: 10, reaction: [0.2, 0.32], aim: 0.016, drift: 0.01, turn: 9, lead: 1, range: 0.95, view: 90, fov: 2.4, hear: 14, memory: 4, burst: [0.3, 0.7], pause: [0.12, 0.3], cover: 0.9, strafe: 0.9, bombs: 0.9, shield: 0.9, clean: 1, loot: 0.3, smart: true, airdrop: 0.7, zone: 40 },
];
export const BOT_LEVELS_BY_ID = Object.fromEntries(BOT_LEVELS.map((l) => [l.id, l]));
export const DEFAULT_BOT_LEVEL = 'medium';

// Names: "Bot Arjun". Indian first names, picked at random per room, never repeated in a room.
export const BOT_NAMES = ['Arjun', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Meera', 'Karan', 'Ishita', 'Aditya', 'Kavya', 'Rahul', 'Sneha', 'Siddharth', 'Pooja', 'Nikhil', 'Divya', 'Aman', 'Riya', 'Harsh', 'Tanvi', 'Varun', 'Neha', 'Yash', 'Aditi', 'Kunal', 'Shreya', 'Manav', 'Nandini', 'Dev', 'Isha', 'Parth', 'Simran', 'Akash', 'Anjali', 'Tushar', 'Lakshmi'];

// Server-wide limits (Render's free instance has very little CPU): rooms with bots at once, and bots in total.
export const BOT_LIMITS = { rooms: 3, total: 33 };
export const botsBusyMessage = (lim = BOT_LIMITS) => `Bots are busy on this server right now (${lim.rooms} rooms with bots, ${lim.total} bots at most). Try again in a few minutes, or play with friends.`;

// "Bot Arjun" for a nickname; the badge goes in front wherever players are listed.
export const botLabel = (p) => (p?.bot ? `${BOT_BADGE} ${p.nickname}` : p?.nickname || '');
