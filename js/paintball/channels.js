// Voice chat channels, shared by the game server (which relays WebRTC signalling only inside a channel) and the
// browser (which opens peer connections only inside a channel). Plain data, no DOM.
//
//   lobby, results:          everyone in the room
//   team paintball match:    your own team only (opponents never hear you)
//   free-for-all / duel:     everyone (a private room of friends; push-to-talk is opt-in, so nobody is heard by accident)
export function sameChannel(a, b, { phase, teams }) {
  if (!a || !b || a === b) return false;
  const inMatch = phase === 'countdown' || phase === 'playing' || phase === 'overtime';
  if (!inMatch || !teams) return true;
  return a.team >= 0 && a.team === b.team;
}

// Ids of the voice-enabled players `me` talks with. players: iterable of [id, player]; player.voice = voice on.
export function voicePeers(meId, players, ctx) {
  const all = new Map(players);
  const me = all.get(meId);
  if (!me || !me.voice) return [];
  const out = [];
  for (const [id, p] of all) if (id !== meId && p.voice && p.connected !== false && sameChannel(me, p, ctx)) out.push(id);
  return out.sort();
}
