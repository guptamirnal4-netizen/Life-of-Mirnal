# Play with BITSians: paintball game server

A [Colyseus](https://colyseus.io) 0.18 server (MIT) for the multiplayer paintball match. It runs the match
server-authoritatively at 20 ticks/s: clients send inputs only, and the server moves everyone, fires and flies the
paintballs, applies paint, tags, assists, scores and runs the match clock. Rooms are private and joined by a
5-character code. Nicknames last only for the session. Nothing is stored: no accounts, no database, no match
history. Voice chat is peer-to-peer WebRTC. The server only relays the connection details (offer, answer and ICE)
between players in the same voice channel, and it never receives or stores audio.

Files: `index.js` (bootstrap, `/health`, origin checks), `PaintballRoom.js` (the room), `schema.js` (synced
state), `logic/match.js` (pure rules, unit-tested). The shared rules, equipment, arena and movement code live in
`../js/paintball/` and the browser uses the same files.

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
| `ALLOWED_ORIGINS` | (none) | Extra browser origins, comma-separated. `https://play-with-bitsians.vercel.app`, `https://play-with-bitsian.vercel.app`, `https://life-of-mirnal.vercel.app` and any `localhost` origin are always allowed. Other origins get a 403 on the WebSocket upgrade, and CORS does not reflect them. |
| `PB_TEST` | unset | `1` turns on the test flag: short match durations and test helpers. Never set it in production. |

Health check: `GET /health` returns `{"ok":true,"rooms":N,"test":false}`.

Tests: `npm test` (pure logic), `npm run test:mp` (the real server plus `@colyseus/sdk` clients over WebSocket),
`node tests/browser/paintball.mjs` (real Chrome pages; it starts both servers itself).

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
