// Connecting to the paintball server: wake it up (free hosts sleep when idle), then create or join a room by
// code. Never pretends: if there is no server, the caller is told so.
import { Client } from '@colyseus/sdk';
import { serverUrl, healthUrl } from '../config.js';
import { normaliseCode } from './codes.js';

export class Net {
  constructor() {
    this.url = serverUrl();
    this.client = this.url ? new Client(this.url) : null;
  }
  get configured() { return !!this.url; }

  // Resolves when /health answers. onStatus(text) reports progress; gives up after `ms`.
  async wake(onStatus = () => {}, ms = 75000) {
    if (!this.url) throw new Error('not-configured');
    const t0 = Date.now(); let tries = 0;
    for (;;) {
      tries++;
      try {
        const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 6000);
        const r = await fetch(healthUrl(this.url), { signal: ctl.signal, cache: 'no-store' });
        clearTimeout(tm);
        if (r.ok) return true;
      } catch { /* asleep or unreachable */ }
      if (Date.now() - t0 > ms) throw new Error('unreachable');
      onStatus(tries === 1 ? 'Connecting to the game server…' : 'Waking the game server… (can take ~30 s)');
      await new Promise((res) => setTimeout(res, 2500));
    }
  }

  create(options) { return this.client.create('paintball', options); }
  join(code, options) { return this.client.joinById(normaliseCode(code), options); }
  reconnect(token) { return this.client.reconnect(token); }
}

// Error text for a failed create/join.
export function joinError(e) {
  const m = String(e?.message || e || '');
  if (/not found|invalid|no rooms|room "?\w*"? not/i.test(m)) return 'No room with that code. Check the code (5 letters/numbers) and try again.';
  if (/locked|full/i.test(m)) return 'That room is full or its paintball match has already started.';
  return `Could not join: ${m || 'the game server did not answer'}.`;
}
