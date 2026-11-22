# Play with BITSians: paintball game server

A [Colyseus](https://colyseus.io) 0.18 server (MIT) for the multiplayer paintball match. It runs the match
server-authoritatively at 20 ticks/s: clients send inputs only, and the server moves everyone, fires and flies the
paintballs, applies paint, tags, assists, scores and runs the match clock. Rooms are private and joined by a
5-character code. Nicknames last only for the session. Nothing is stored: no accounts, no database, no match
history. Voice chat is peer-to-peer WebRTC. The server only relays the connection details (offer, answer and ICE)
between players in the same voice channel, and it never receives or stores audio.

Files: `index.js` (bootstrap, `/health`, origin checks), `PaintballRoom.js` (the room), `schema.js` (synced
state), `logic/match.js` (pure rules, unit-tested), `logic/royale.js` (Campus Royale), `geo.js` (loads the campus
geometry), `bots/` (computer-controlled players: `brain.js`, `manager.js`, `nav.js`). The shared rules, equipment, arenas, items and movement code live in `../js/paintball/` and the
browser uses the same files.

## Arenas and rulesets

- **Med-C Ground** (arena `medc`): the 70 × 40 m bunker field, timed match, respawn after a tag, overtime on a tie.
- **Whole Campus · Campus Royale** (arena `campus`): the whole BITS campus inside its boundary wall. Landing phase
  (pick a spot on the campus map from a verified registry; squads land together; no pick → placed far from
  everyone), supply crates at verified supply spots (open with E, server-owned contents, unique item uids), paint
  bombs, colour smoke, protective gear, cleaning kits, paint shield, paint-scan pulse, a special supply drop
  mid-match, a paint zone shrinking in 7 timed phases (~10 min), no respawn (squads: a teammate can clean you off
  within 20 s), last player or squad standing wins; results with placement, survival time and supplies collected.
  Rules: `js/paintball/royale.js`, items: `js/paintball/items.js`.

## Bots

Computer-controlled players, so one person can play alone (the portal's **PLAY VS BOTS**: a private room created
with `practice: { mode, bots, level }`, filled with bots and started at once, no ready-up) and hosts can fill empty
slots (`bot:add`, `bot:fill`, `bot:remove`, `bot:level`; host only, lobby only; team modes can start with bots
filling the teams; a mode change trims bots that no longer fit).

- **Players like any other.** A bot is a `PbPlayer` with `bot: true` (a 🤖 badge in the lobby, HUD feed,
  scoreboard, results and over its head; `PbRank.bot` in results), names like "Bot Arjun". It never has voice on and
  WebRTC signalling to it is dropped. Scoring is unchanged.
- **Same inputs, same rules.** Its AI (`bots/brain.js`) produces exactly what a browser sends (`in` with move
  intent, run, jump, yaw/pitch, fire, reload, slot; `land`, `open`, `pick`, `throw`, `use`, `revive`) and the room
  runs them through the same handlers (`room.dispatch` → the message's handler), so cooldowns, paintball counts,
  pick-up range and line of sight, and hit detection are the server's own. No cheating: it only notices opponents in
  its view cone and range (or very close, or who just painted it) with a clear line of sight (the arena's ray check),
  reacts after a delay and aims with an error, both by difficulty.
- **Difficulty** (`js/paintball/bots.js`, the host picks one per room): Easy / Medium / Hard set the think rate
  (5–10 Hz), reaction time, aim error and drift, turn speed, target leading, fire discipline, view range, cover,
  strafing, paint bombs, shield and cleaning use, looting speed and judgement, supply-drop racing and how early it
  heads for the next zone circle.
- **Behaviour**: a small utility state machine (roam, loot, engage, chase, cover, zone, revive, follow, channel)
  thinking a few times a second, steering every tick: picks the blaster for the range, strafes, takes cover when
  painted or reloading, throws paint bombs at players behind cover or in a group, raises the shield / cleans when
  painted, keeps inside the paint zone and moves to the next circle early, races to the supply drop sometimes, sticks
  with its squad and cleans off downed teammates (no friendly fire), lands spread out (squads together; a squad with
  a human leaves the landing pick to them), and respawns and re-engages in timed matches.
- **Navigation.** Med-C: a visibility graph round the bunkers. Whole Campus: a waypoint graph
  (`js/paintball/data/bot-nav.{bin,json}`, ~155 KB gzip, 23 k nodes / 151 k edges) built offline by
  `node dev/build-bot-nav.mjs` (~40 s) from the same 1 m flood fill as the Campus Royale registries: every node is
  a patch of mutually reachable ground in an 8 m cell (floors, stairs, building interiors through doorways, the
  sunken NAB / Rotunda courts), every edge is walkable in straight lines through its via points. The server checks
  its hash and the campus hash it was built for. A* is time-sliced (an expansion budget per tick) with a path cache;
  stuck bots hop, side-step, go back a waypoint, re-plan, then give up the goal.
- **Load.** Per room per tick: at most 8 bot "thinks", 32 line-of-sight rays (96 on Med-C) and 6000 A* expansions;
  the room records its tick time and logs p50 / p95 / max with RSS every minute while bots play. Server-wide cap:
  3 rooms with bots and 33 bots in total (`PB_BOT_ROOMS`, `PB_BOT_TOTAL`); past it, creating a Play vs Bots room or
  adding a bot is refused with "Bots are busy on this server right now…". Measured locally (tests/mp/bots.mjs): see
  the tick line it prints for 1 human + 11 Hard bots on the Whole Campus.
- **Lifecycle.** Bots never keep a room open: when the last human leaves, the bots are removed and the empty room
  closes. Rematch keeps the bots. A Play vs Bots room stays locked to its creator.

When the campus export changes, rebuild the nav graph with the registries (below).

## Campus geometry (Campus Royale)

The server cannot run the browser's campus builder, so the built campus is exported once and committed:

| File | What |
| --- | --- |
| `js/paintball/data/campus-collision.bin` | gzip of every collider (boxes in cm, trees as circles), ~0.95 MB |
| `js/paintball/data/campus-collision.json` | header: version, hash, boundary wall polygon, sunken courts (pits), water, doorways |
| `js/paintball/data/campus-probes.json` | the life-sim player's own walks (stairs, a wall) the paintball sim is tested against |
| `js/paintball/data/royale-spots.json` | verified landing spots (with squad slots), supply spots, final-zone centres |
| `js/paintball/data/bot-nav.bin` / `.json` | the bots' waypoint graph (gzip) and its header (hash, campus hash, counts) |

`js/paintball/geometry.js` decodes it into typed arrays with a 4 m spatial grid (movement copies
`js/world/player.js`: walls block, 0.7 m step-ups, floors and stairs, sunken NAB / Rotunda courts; paintballs and
paint bombs are swept against it). The server loads it at startup (~40 ms, ~110 MB RSS for the whole process) and
refuses to start if the hash does not match; the browser fetches the same files and checks the same hash.

**When campus modules change** (`js/world/bits-world.js`, `js/world/buildings/*`, `hostel.js`, `comb-hostel.js`,
`data/bits-campus.js`), re-export and rebuild the registries, then run the tests:

```sh
node dev/export-campus-collision.mjs   # headless Chrome; deterministic (same campus → same hash)
node dev/build-royale-spots.mjs        # Node only, ~40 s: reachability flood fill, validated spots
node dev/build-bot-nav.mjs             # Node only, ~40 s: the bots' waypoint graph
npm test && npm run test:mp
```

## Run locally

```sh
npm install            # at the repo root (installs Colyseus for the server, the tests and the client SDK)
npm run server         # ws://localhost:2567
npm start              # in another terminal: the game on http://localhost:8080 (it finds the local server)
```

On a `localhost` page, the browser connects to `ws://localhost:2567`. Tests point it at another local port with
`?pbserver=ws://localhost:PORT`.

| Env var | Default | Meaning |
| --- | --- | --- |
| `PORT` | `2567` | Listening port (Render sets it) |
| `HOST` | `0.0.0.0` | Listening address |
| `ALLOWED_ORIGINS` | (none) | Extra browser origins, comma-separated. `https://play-with-bitsians.vercel.app`, `https://play-with-bitsian.vercel.app` and any `localhost` origin are always allowed (add older deployment addresses here). Other origins get a 403 on the WebSocket upgrade, and CORS does not reflect them. |
| `PB_TEST` | unset | `1` turns on the test flag: short match durations and test helpers. Never set it in production. |
| `PB_BOT_ROOMS` / `PB_BOT_TOTAL` | `3` / `33` | Server-wide bot cap: rooms with bots at once, bots in total |

Health check: `GET /health` returns `{"ok":true,"rooms":N,"test":false}`.

Tests: `npm test` (pure logic, campus geometry, registries, bot navigation and decisions), `npm run test:mp` (the
real server plus `@colyseus/sdk` clients over WebSocket: `tests/mp/paintball.mjs`, `tests/mp/royale.mjs` and
`tests/mp/bots.mjs`), `node tests/browser/paintball-bots.mjs` (Play vs Bots and the lobby's bot controls in Chrome),
`node tests/browser/paintball.mjs` and `node tests/browser/paintball-campus.mjs` (real Chrome pages; they start both
servers themselves), `node tests/browser/paintball-perf.mjs 12 x campus` (frame time with 12 clients).

## Deploy (Render)

Vercel serverless functions cannot hold a long-lived WebSocket server. The static game stays on Vercel, and this
server needs its own host. The repo includes a Render Blueprint (`render.yaml`): a free Node web service in
Singapore. It builds from the repo root with `npm ci --omit=dev --prefix server`, which installs only this folder's
Colyseus dependencies (no dev dependencies, no three.js). It starts with `npm run server` and is health-checked at
`/health`.

1. Push the branch to GitHub.
2. On Render, choose **New → Blueprint**, pick the repository, and apply `render.yaml`. This creates
   `play-with-bitsians-server`.
3. Wait until the deploy is live and `https://<service>.onrender.com/health` answers `{"ok":true,...}`.
4. Put `wss://<service>.onrender.com` in `PRODUCTION_SERVER_URL` in `js/paintball/config.js`, then redeploy
   the static site on Vercel.
5. If the game is served from another origin (a preview URL or a custom domain), add it to `ALLOWED_ORIGINS`
   in the Render dashboard.

Free Render instances sleep after about 15 minutes idle and take around 30 s to wake. The game polls `/health`
and shows "Waking the game server… (can take ~30 s)" with a retry, and it does not fail at once. Rooms live in
memory. A restart or redeploy ends every open room, and players see that they were disconnected.

Other WebSocket hosts (Fly.io, Railway, a VPS) work the same way: `npm ci --omit=dev --prefix server`, then
`PORT=… node server/index.js` from the repo root behind TLS (`wss://`).
