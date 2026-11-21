// Paintball match rules: modes, scoring, timings. Shared by the game server (server/) and the browser.
// Plain data, no three.js or DOM.

// teams: number of teams (0 = every player for themself); size: players per team; players: [min, max].
// Team modes need exactly teams × size players to start.
export const MODES = [
  { id: 'ffa', name: 'Individual Free-for-All', teams: 0, size: 1, players: [2, 12] }, // shown as "Individual Duel" with 2 players
  { id: '6v6', name: '6v6', teams: 2, size: 6, players: [12, 12] },
  { id: '4v4', name: '4v4', teams: 2, size: 4, players: [8, 8] },
  { id: '3v3v3v3', name: '3v3v3v3', teams: 4, size: 3, players: [12, 12] },
  { id: '2v2v2v2v2', name: '2v2v2v2v2', teams: 5, size: 2, players: [10, 10] },
];
export const MODES_BY_ID = Object.fromEntries(MODES.map((m) => [m.id, m]));
export const modeLabel = (mode, players) => (mode.id === 'ffa' ? (players === 2 ? 'Individual Duel' : 'Individual Free-for-All') : mode.name);

export const MAX_PLAYERS = 12;
export const TEAMS = [
  { name: 'Pink', colour: '#ff3d7f' },
  { name: 'Cyan', colour: '#30d5ff' },
  { name: 'Yellow', colour: '#ffd23d' },
  { name: 'Lime', colour: '#7cff4f' },
  { name: 'Violet', colour: '#b26bff' },
];

export const SCORE = { tag: 100, assist: 40, completion: 20, win: 50 };
// A player who painted the target within ASSIST_WINDOW seconds before someone else tagged them gets an assist.
export const ASSIST_WINDOW = 6;

export const TIMING = {
  duration: 8 * 60, // default match length, s
  durations: [3 * 60, 5 * 60, 8 * 60, 10 * 60], // the host may pick one
  overtime: 60, // on a tie for first place
  countdown: 3,
  respawn: 4, // round elimination → back in after this many seconds
  protection: 3, // spawn protection: cannot be painted, cannot fire
  roomIdleClose: 10 * 60, // an empty or idle room is cleared after this many seconds
  reconnect: 30, // seconds a dropped player's slot is held
};

export const MOVE = { walk: 4.2, run: 6.8, jump: 5.2, gravity: 16, radius: 0.35, height: 1.75, eye: 1.6, head: 1.5 };
export const TICK_HZ = 20; // server simulation and state patch rate
