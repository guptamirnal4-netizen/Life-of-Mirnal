// Where the multiplayer paintball server lives.
//
// The static game is on Vercel, which cannot host a long-lived WebSocket server, so the Colyseus server
// (server/, see server/README.md) runs on its own host (Render). Put its public WebSocket URL here once it exists,
// e.g. 'wss://play-with-bitsians.onrender.com'. Empty = not configured: the game says so plainly.
export const PRODUCTION_SERVER_URL = '';

const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/;

// ws(s):// URL of the game server, or '' when none is configured.
// On a local page, ?pbserver=ws://localhost:PORT points the game at another local server (used by the tests).
export function serverUrl(loc = globalThis.location) {
  const local = loc && LOCAL.test(loc.hostname);
  if (local) {
    const o = new URLSearchParams(loc.search).get('pbserver');
    if (o && /^wss?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) return o;
    return `ws://${loc.hostname === '[::1]' ? 'localhost' : loc.hostname}:2567`;
  }
  return PRODUCTION_SERVER_URL;
}

// The server's HTTP health check for a ws(s) URL.
export const healthUrl = (ws) => `${ws.replace(/^ws/, 'http')}/health`;
