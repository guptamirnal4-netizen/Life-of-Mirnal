// Paintball room state, synced to every client by Colyseus (@colyseus/schema 5 builder API, plain JavaScript).
import { schema, t } from '@colyseus/schema';

export const PbPlayer = schema({
  nickname: t.string().default(''),
  connected: t.boolean().default(true),
  ready: t.boolean().default(false),
  host: t.boolean().default(false),
  team: t.int8().default(-1),
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
}, 'PbPlayer');

export const PbRank = schema({
  id: t.string(), nickname: t.string(), team: t.int8().default(-1), place: t.uint8(),
  score: t.int32(), tags: t.uint16(), assists: t.uint16(), timesTagged: t.uint16(),
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
  phase: t.string().default('lobby'), // lobby | countdown | playing | overtime | results
  now: t.float32().default(0), // room clock, s since the room opened
  phaseEnds: t.float32().default(0), // room clock when the countdown / match / overtime ends
  teamsLocked: t.boolean().default(false),
  teamScores: t.array('int32'),
  slotsOpen: t.uint8().default(12),
  testMode: t.boolean().default(false),
  players: t.map(PbPlayer),
  results: t.ref(PbResults).default(() => new PbResults()),
}, 'PbState');
