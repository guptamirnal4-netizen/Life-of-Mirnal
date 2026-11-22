// Paintball room state, synced to every client by Colyseus (@colyseus/schema 5 builder API, plain JavaScript).
import { schema, t, Encoder } from '@colyseus/schema';

// Campus Royale's full state (a few hundred supplies on the ground) is larger than the default 8 KB first patch.
Encoder.BUFFER_SIZE = 256 * 1024;

export const PbPlayer = schema({
  nickname: t.string().default(''),
  connected: t.boolean().default(true),
  ready: t.boolean().default(false),
  host: t.boolean().default(false),
  team: t.int8().default(-1),
  bot: t.boolean().default(false), // a computer-controlled player (server/bots/): shown with a 🤖 badge, never in voice chat
  // character customisation
  character: t.uint8().default(0), // a base look (js/paintball/looks.js)
  outfit: t.string().default('#30d5ff'),
  pants: t.string().default('#2d3436'),
  mask: t.string().default('#ff3d7f'),
  accessory: t.string().default('none'),
  // paintball equipment: two of the six, the one in hand, paintballs per blaster
  primary: t.string().default('standard'),
  secondary: t.string().default('rapid'),
  slot: t.uint8().default(0),
  equip: t.string().default('standard'),
  hopper0: t.uint16().default(0),
  carried0: t.uint16().default(0),
  hopper1: t.uint16().default(0),
  carried1: t.uint16().default(0),
  reloadUntil: t.float32().default(0), // room clock, s
  switchUntil: t.float32().default(0),
  used: t.string().default(''), // equipment used this match, comma-separated
  // paint and life
  paint: t.float32().default(0),
  alive: t.boolean().default(true),
  respawnAt: t.float32().default(0),
  protectedUntil: t.float32().default(0),
  // movement (server-simulated)
  x: t.float32().default(0),
  y: t.float32().default(0),
  z: t.float32().default(0),
  vy: t.float32().default(0),
  yaw: t.float32().default(0),
  pitch: t.float32().default(0),
  seq: t.uint32().default(0), // last input the server applied (client reconciliation)
  // match score
  score: t.int32().default(0),
  tags: t.uint16().default(0),
  assists: t.uint16().default(0),
  timesTagged: t.uint16().default(0),
  // voice chat: switched on, talking now
  voice: t.boolean().default(false),
  talking: t.boolean().default(false),
  // Campus Royale (js/paintball/royale.js, items.js): inventory, gear, channelled actions, elimination
  ammo: t.map('uint16'), // paintballs carried per blaster type
  paintbomb: t.uint8().default(0),
  smoke: t.uint8().default(0),
  wipes: t.uint8().default(0),
  kit: t.uint8().default(0),
  gearMask: t.uint8().default(0), // protective gear tiers 0–3
  gearVest: t.uint8().default(0),
  channel: t.string().default(''), // '' | 'wipes' | 'kit' | 'revive' (cleaning a teammate)
  channelUntil: t.float32().default(0),
  down: t.boolean().default(false), // squads: fully painted, waiting to be cleaned off by a teammate
  downUntil: t.float32().default(0),
  out: t.boolean().default(false), // round elimination for the rest of the match (spectating)
  placement: t.uint8().default(0),
  survived: t.float32().default(0), // s from the start of play to elimination (or the end)
  drop: t.int16().default(-1), // chosen landing spot (drop registry id)
  watching: t.string().default(''), // spectating this player
  shield: t.uint8().default(0), // paint shields carried
  scan: t.uint8().default(0), // paint-scan pulses carried
  shieldUntil: t.float32().default(0), // a paint shield is up until then: no paint lands (and no firing)
  supplies: t.uint16().default(0), // supplies collected this match
}, 'PbPlayer');

// One item inside a supply crate: an item id (js/paintball/items.js) and how many.
export const PbLoot = schema({ item: t.string(), n: t.uint16().default(1) }, 'PbLoot');

// A supply crate in Campus Royale (server-owned contents, keyed by a unique item uid so two players can never take
// the same item): 'crate' (placed at a verified supply spot), 'drop' (the mid-match special supply drop), 'pile'
// (what a player dropped or left behind; it disappears when empty). Opened crates show open to everyone.
export const PbCrate = schema({
  kind: t.string().default('crate'), x: t.float32(), y: t.float32(), z: t.float32(),
  opened: t.boolean().default(false), items: t.map(PbLoot),
}, 'PbCrate');

// The special supply drop: where and when it lands (announced in advance), whether it has landed, its crate id.
export const PbAirdrop = schema({
  x: t.float32().default(0), y: t.float32().default(0), z: t.float32().default(0),
  at: t.float32().default(0), announced: t.boolean().default(false), landed: t.boolean().default(false), crate: t.string().default(''),
}, 'PbAirdrop');

// The play zone: the current circle (shrinking towards next), the phase, when this stage ends, paint per second
// outside.
export const PbZone = schema({
  x: t.float32().default(0), z: t.float32().default(0), r: t.float32().default(0),
  nx: t.float32().default(0), nz: t.float32().default(0), nr: t.float32().default(0),
  phase: t.uint8().default(0), phases: t.uint8().default(0), shrinking: t.boolean().default(false),
  ends: t.float32().default(0), dps: t.float32().default(0),
}, 'PbZone');

export const PbRank = schema({
  id: t.string(), nickname: t.string(), team: t.int8().default(-1), place: t.uint8(), bot: t.boolean().default(false),
  score: t.int32(), tags: t.uint16(), assists: t.uint16(), timesTagged: t.uint16(),
  placement: t.uint8().default(0), survived: t.float32().default(0), supplies: t.uint16().default(0), // Campus Royale
}, 'PbRank');

export const PbTeamResult = schema({
  team: t.int8(), name: t.string(), colour: t.string(), score: t.int32(), tags: t.uint16(), place: t.uint8(),
}, 'PbTeamResult');

export const PbResults = schema({
  ready: t.boolean().default(false),
  draw: t.boolean().default(false),
  winner: t.string().default(''),
  runnerUp: t.string().default(''),
  mvp: t.string().default(''),
  mvpName: t.string().default(''),
  rankings: t.array(PbRank),
  teams: t.array(PbTeamResult),
}, 'PbResults');

export const PbState = schema({
  code: t.string().default(''),
  mode: t.string().default('ffa'),
  arena: t.string().default('medc'),
  duration: t.uint16().default(480),
  phase: t.string().default('lobby'), // lobby | landing (Campus Royale) | countdown | playing | overtime | results
  now: t.float32().default(0), // room clock, s since the room opened
  phaseEnds: t.float32().default(0), // room clock when the countdown / match / overtime ends
  teamsLocked: t.boolean().default(false),
  teamScores: t.array('int32'),
  slotsOpen: t.uint8().default(12),
  testMode: t.boolean().default(false),
  botLevel: t.string().default('medium'), // bots' difficulty in this room (js/paintball/bots.js), host's choice
  practice: t.boolean().default(false), // a Play vs Bots room: only its creator, started straight away
  players: t.map(PbPlayer),
  results: t.ref(PbResults).default(() => new PbResults()),
  // Campus Royale
  geo: t.string().default(''), // hash of the campus collision export the server runs (the client checks it loaded the same)
  crates: t.map(PbCrate),
  airdrop: t.ref(PbAirdrop).default(() => new PbAirdrop()),
  zone: t.ref(PbZone).default(() => new PbZone()),
  standing: t.uint8().default(0), // players not yet eliminated
  groups: t.uint8().default(0), // players (free-for-all) or squads still standing
  playStart: t.float32().default(0),
}, 'PbState');
