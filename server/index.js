// "Play with BITSians" multiplayer paintball server (Colyseus 0.18).
//
//   npm run server                       → ws://localhost:2567
//   PORT=3000 npm run server             → another port (Render sets PORT itself)
//   PB_TEST=1 npm run server             → test flag: short match durations and test helpers (never in production)
//   ALLOWED_ORIGINS=https://a.example,https://b.example  → extra browser origins allowed to connect
//
// Health check: GET /health → { ok: true, rooms }.
import { fileURLToPath } from 'node:url';
import { Server, matchMaker, createRouter, createEndpoint } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { PaintballRoom, TestPaintballRoom, liveRooms } from './PaintballRoom.js';

const DEFAULT_ORIGINS = ['https://play-with-bitsian.vercel.app', 'https://life-of-mirnal.vercel.app'];
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

export function originAllowed(origin, extra = []) {
  if (!origin) return true; // not a browser (server-to-server, tests)
  return LOCAL.test(origin) || DEFAULT_ORIGINS.includes(origin) || extra.includes(origin);
}

export async function startServer({ port = Number(process.env.PORT) || 2567, host = process.env.HOST || '0.0.0.0', test = process.env.PB_TEST === '1', origins = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean), quiet = false } = {}) {
  matchMaker.controller.standardHttpStatus = true; // a missing room is a 404, not Colyseus' 522 (SDK 0.18.10+ reads the body)
  // Browsers: only the game's own origins may call the matchmaking HTTP routes or open a WebSocket.
  matchMaker.controller.getCorsHeaders = (headers) => {
    const o = headers.get('origin');
    return { 'Access-Control-Allow-Origin': o && originAllowed(o, origins) ? o : DEFAULT_ORIGINS[0], Vary: 'Origin' };
  };
  const transport = new WebSocketTransport({
    beforeUpgrade: (request) => (originAllowed(request.headers.get('origin'), origins) ? undefined : new Response('origin not allowed', { status: 403 })),
  });
  const server = new Server({ transport, greet: false, gracefullyShutdown: !test && !quiet, logger: quiet ? { info() {}, debug() {}, warn() {}, error: console.error } : undefined });
  const health = createEndpoint('/health', { method: 'GET' }, async () => new Response(JSON.stringify({ ok: true, rooms: liveRooms.size, test }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }));
  server.router = createRouter({ health });
  server.define('paintball', test ? TestPaintballRoom : PaintballRoom);
  await server.listen(port, host);
  const actual = transport.server?.address?.()?.port ?? port;
  if (!quiet) console.log(`Play with BITSians paintball server → ws://localhost:${actual}${test ? ' (test flag on)' : ''}`);
  return { server, port: actual, close: () => server.gracefullyShutdown(false) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startServer({ test: process.env.PB_TEST === '1' || process.argv.includes('--test') }).catch((e) => { console.error(e); process.exit(1); });
}
